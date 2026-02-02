package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/spruceid/siwe-go"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/domain/audit"
)

var nonceStore = make(map[string]time.Time)

type NonceResponse struct {
	Nonce string `json:"nonce"`
}

type VerifyRequest struct {
	Message   string `json:"message"`
	Signature string `json:"signature"`
}

type VerifyResponse struct {
	Token   string `json:"token"`
	Address string `json:"address"`
}

func (h *Handlers) GenerateNonce(w http.ResponseWriter, r *http.Request) {
	nonce := make([]byte, 16)
	if _, err := rand.Read(nonce); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate nonce")
		return
	}

	nonceStr := hex.EncodeToString(nonce)
	nonceStore[nonceStr] = time.Now().Add(5 * time.Minute)

	// Clean up old nonces
	now := time.Now()
	for k, v := range nonceStore {
		if v.Before(now) {
			delete(nonceStore, k)
		}
	}

	respondJSON(w, http.StatusOK, NonceResponse{Nonce: nonceStr})
}

func (h *Handlers) VerifySignature(w http.ResponseWriter, r *http.Request) {
	var req VerifyRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Parse the SIWE message
	msg, err := siwe.ParseMessage(req.Message)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid SIWE message")
		return
	}

	// Verify nonce
	expiry, exists := nonceStore[msg.GetNonce()]
	if !exists || time.Now().After(expiry) {
		respondError(w, http.StatusBadRequest, "invalid or expired nonce")
		return
	}
	delete(nonceStore, msg.GetNonce())

	// Verify signature
	_, err = msg.Verify(req.Signature, nil, nil, nil)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid signature")
		return
	}

	address := msg.GetAddress().Hex()

	// Upsert wallet
	var walletID uuid.UUID
	err = h.db.QueryRow(r.Context(),
		`INSERT INTO wallets (address) VALUES ($1)
		 ON CONFLICT (address) DO UPDATE SET last_login_at = NOW()
		 RETURNING id`,
		address,
	).Scan(&walletID)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to upsert wallet")
		respondError(w, http.StatusInternalServerError, "failed to create wallet")
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":    walletID.String(),
		"wallet": address,
		"iat":    time.Now().Unix(),
		"exp":    time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(h.cfg.JWT.Secret))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// Log audit event
	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  walletID,
		EventType: "auth.login",
		Details:   map[string]interface{}{"address": address},
	})

	respondJSON(w, http.StatusOK, VerifyResponse{
		Token:   tokenString,
		Address: address,
	})
}

type CreateAPIKeyRequest struct {
	Name string `json:"name"`
}

type CreateAPIKeyResponse struct {
	ID   uuid.UUID `json:"id"`
	Key  string    `json:"key"`
	Name string    `json:"name"`
}

func (h *Handlers) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateAPIKeyRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Generate API key
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate key")
		return
	}
	key := fmt.Sprintf("erc8004_%s", hex.EncodeToString(keyBytes))

	var keyID uuid.UUID
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO api_keys (wallet_id, name, key_hash, key_prefix)
		 VALUES ($1, $2, encode(sha256($3::bytea), 'hex'), $4)
		 RETURNING id`,
		userID, req.Name, key, key[:16],
	).Scan(&keyID)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to create API key")
		respondError(w, http.StatusInternalServerError, "failed to create API key")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		EventType: "api_key.created",
		Details:   map[string]interface{}{"key_id": keyID, "name": req.Name},
	})

	respondJSON(w, http.StatusCreated, CreateAPIKeyResponse{
		ID:   keyID,
		Key:  key,
		Name: req.Name,
	})
}

type APIKeyListItem struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	KeyPrefix string     `json:"key_prefix"`
	CreatedAt time.Time  `json:"created_at"`
	LastUsed  *time.Time `json:"last_used_at,omitempty"`
}

func (h *Handlers) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, name, key_prefix, created_at, last_used_at
		 FROM api_keys WHERE wallet_id = $1 AND revoked_at IS NULL
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list API keys")
		return
	}
	defer rows.Close()

	var keys []APIKeyListItem
	for rows.Next() {
		var k APIKeyListItem
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.CreatedAt, &k.LastUsed); err != nil {
			continue
		}
		keys = append(keys, k)
	}

	if keys == nil {
		keys = []APIKeyListItem{}
	}

	respondJSON(w, http.StatusOK, keys)
}

func (h *Handlers) DeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	keyIDStr := r.PathValue("id")

	keyID, err := uuid.Parse(keyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid key id")
		return
	}

	result, err := h.db.Exec(r.Context(),
		`UPDATE api_keys SET revoked_at = NOW() WHERE id = $1 AND wallet_id = $2 AND revoked_at IS NULL`,
		keyID, userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete API key")
		return
	}

	if result.RowsAffected() == 0 {
		respondError(w, http.StatusNotFound, "API key not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		EventType: "api_key.revoked",
		Details:   map[string]interface{}{"key_id": keyID},
	})

	w.WriteHeader(http.StatusNoContent)
}
