package handlers

import (
	"encoding/json"
	"math/big"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/blockchain"
	"github.com/erc8004/policy-saas/internal/domain/audit"
)

type Permission struct {
	ID             uuid.UUID  `json:"id"`
	WalletID       uuid.UUID  `json:"wallet_id"`
	AgentID        uuid.UUID  `json:"agent_id"`
	PolicyID       uuid.UUID  `json:"policy_id"`
	Status         string     `json:"status"`
	OnchainTokenID *string    `json:"onchain_token_id,omitempty"`
	ValidFrom      time.Time  `json:"valid_from"`
	ValidUntil     *time.Time `json:"valid_until,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	RevokedAt      *time.Time `json:"revoked_at,omitempty"`
	MintedAt       *time.Time `json:"minted_at,omitempty"`
}

type CreatePermissionRequest struct {
	AgentID    uuid.UUID  `json:"agent_id"`
	PolicyID   uuid.UUID  `json:"policy_id"`
	ValidFrom  *time.Time `json:"valid_from,omitempty"`
	ValidUntil *time.Time `json:"valid_until,omitempty"`
}

func (h *Handlers) CreatePermission(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreatePermissionRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Verify agent belongs to user
	var agentExists bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM agents WHERE id = $1 AND wallet_id = $2 AND status = 'active')`,
		req.AgentID, userID,
	).Scan(&agentExists)
	if !agentExists {
		respondError(w, http.StatusBadRequest, "agent not found or inactive")
		return
	}

	// Verify policy belongs to user and is active
	var policyActive bool
	h.db.QueryRow(r.Context(),
		`SELECT EXISTS(SELECT 1 FROM policies WHERE id = $1 AND wallet_id = $2 AND status = 'active')`,
		req.PolicyID, userID,
	).Scan(&policyActive)
	if !policyActive {
		respondError(w, http.StatusBadRequest, "policy not found or not active")
		return
	}

	validFrom := time.Now()
	if req.ValidFrom != nil {
		validFrom = *req.ValidFrom
	}

	var perm Permission
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO permissions (wallet_id, agent_id, policy_id, status, valid_from, valid_until)
		 VALUES ($1, $2, $3, 'active', $4, $5)
		 RETURNING id, wallet_id, agent_id, policy_id, status, onchain_token_id, valid_from, valid_until, created_at, revoked_at, minted_at`,
		userID, req.AgentID, req.PolicyID, validFrom, req.ValidUntil,
	).Scan(&perm.ID, &perm.WalletID, &perm.AgentID, &perm.PolicyID, &perm.Status, &perm.OnchainTokenID, &perm.ValidFrom, &perm.ValidUntil, &perm.CreatedAt, &perm.RevokedAt, &perm.MintedAt)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to create permission")
		respondError(w, http.StatusInternalServerError, "failed to create permission")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:     userID,
		AgentID:      &req.AgentID,
		PolicyID:     &req.PolicyID,
		PermissionID: &perm.ID,
		EventType:    "permission.created",
	})

	respondJSON(w, http.StatusCreated, perm)
}

func (h *Handlers) ListPermissions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	agentID := r.URL.Query().Get("agent_id")
	policyID := r.URL.Query().Get("policy_id")

	query := `SELECT id, wallet_id, agent_id, policy_id, status, onchain_token_id, valid_from, valid_until, created_at, revoked_at, minted_at
		 FROM permissions WHERE wallet_id = $1`
	args := []interface{}{userID}

	if agentID != "" {
		query += " AND agent_id = $2"
		args = append(args, agentID)
	}
	if policyID != "" {
		if agentID != "" {
			query += " AND policy_id = $3"
		} else {
			query += " AND policy_id = $2"
		}
		args = append(args, policyID)
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list permissions")
		return
	}
	defer rows.Close()

	var permissions []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.WalletID, &p.AgentID, &p.PolicyID, &p.Status, &p.OnchainTokenID, &p.ValidFrom, &p.ValidUntil, &p.CreatedAt, &p.RevokedAt, &p.MintedAt); err != nil {
			continue
		}
		permissions = append(permissions, p)
	}

	if permissions == nil {
		permissions = []Permission{}
	}

	respondJSON(w, http.StatusOK, permissions)
}

func (h *Handlers) GetPermission(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	permIDStr := r.PathValue("id")

	permID, err := uuid.Parse(permIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid permission id")
		return
	}

	var perm Permission
	err = h.db.QueryRow(r.Context(),
		`SELECT id, wallet_id, agent_id, policy_id, status, onchain_token_id, valid_from, valid_until, created_at, revoked_at, minted_at
		 FROM permissions WHERE id = $1 AND wallet_id = $2`,
		permID, userID,
	).Scan(&perm.ID, &perm.WalletID, &perm.AgentID, &perm.PolicyID, &perm.Status, &perm.OnchainTokenID, &perm.ValidFrom, &perm.ValidUntil, &perm.CreatedAt, &perm.RevokedAt, &perm.MintedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "permission not found")
		return
	}

	respondJSON(w, http.StatusOK, perm)
}

func (h *Handlers) DeletePermission(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	permIDStr := r.PathValue("id")

	permID, err := uuid.Parse(permIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid permission id")
		return
	}

	// Check if the permission was minted on-chain (need to revoke there too)
	var onchainTokenID *string
	h.db.QueryRow(r.Context(),
		`SELECT onchain_token_id FROM permissions WHERE id = $1 AND wallet_id = $2 AND status = 'active'`,
		permID, userID,
	).Scan(&onchainTokenID)

	// Revoke on-chain if permission was minted
	if onchainTokenID != nil && *onchainTokenID != "" {
		permIDBytes, decErr := blockchain.HexToBytes32(*onchainTokenID)
		if decErr == nil {
			txHash, bcErr := h.blockchainClient.RevokePermission(r.Context(), permIDBytes)
			if bcErr != nil {
				h.logger.Error().Err(bcErr).Str("permission_id", permID.String()).Msg("on-chain permission revocation failed (continuing with DB revoke)")
			} else {
				h.logger.Info().Str("permission_id", permID.String()).Str("tx_hash", txHash).Msg("permission revoked on-chain")
			}
		}
	}

	var agentID, policyID uuid.UUID
	err = h.db.QueryRow(r.Context(),
		`UPDATE permissions SET status = 'revoked', revoked_at = NOW()
		 WHERE id = $1 AND wallet_id = $2 AND status = 'active'
		 RETURNING agent_id, policy_id`,
		permID, userID,
	).Scan(&agentID, &policyID)
	if err != nil {
		respondError(w, http.StatusNotFound, "permission not found or already revoked")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:     userID,
		AgentID:      &agentID,
		PolicyID:     &policyID,
		PermissionID: &permID,
		EventType:    "permission.revoked",
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) MintPermission(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	permIDStr := r.PathValue("id")

	permID, err := uuid.Parse(permIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid permission id")
		return
	}

	// Query permission details for on-chain minting, including agent's on-chain registration status
	var agentID, policyID uuid.UUID
	var validFrom time.Time
	var validUntil *time.Time
	var defJSON []byte
	var onchainHash *string
	var agentOnchainRegistryID *string
	err = h.db.QueryRow(r.Context(),
		`SELECT p.agent_id, p.policy_id, p.valid_from, p.valid_until, pol.definition, pol.onchain_hash, a.onchain_registry_id
		 FROM permissions p
		 JOIN policies pol ON pol.id = p.policy_id
		 JOIN agents a ON a.id = p.agent_id
		 WHERE p.id = $1 AND p.wallet_id = $2 AND p.status = 'active' AND p.minted_at IS NULL`,
		permID, userID,
	).Scan(&agentID, &policyID, &validFrom, &validUntil, &defJSON, &onchainHash, &agentOnchainRegistryID)
	if err != nil {
		respondError(w, http.StatusNotFound, "permission not found or already minted")
		return
	}

	// Pre-check: agent must be registered on-chain before minting
	if agentOnchainRegistryID == nil || *agentOnchainRegistryID == "" {
		respondError(w, http.StatusBadRequest, "agent must be registered on-chain before minting a permission (use Register On-chain first)")
		return
	}

	// Pre-check: policy must be activated on-chain before minting
	if onchainHash == nil || *onchainHash == "" {
		respondError(w, http.StatusBadRequest, "policy must be activated on-chain before minting a permission (use Activate first)")
		return
	}

	// Decode the on-chain policy ID into [32]byte
	policyHashBytes, decErr := blockchain.HexToBytes32(*onchainHash)
	if decErr != nil {
		h.logger.Error().Err(decErr).Str("onchain_hash", *onchainHash).Msg("failed to decode on-chain policy hash")
		policyHashBytes = blockchain.PolicyContentHash(defJSON)
	}

	agentIDBytes := blockchain.UUIDToBytes32(agentID.String())
	validFromBig := big.NewInt(validFrom.Unix())
	validUntilBig := big.NewInt(0) // 0 = no expiry
	if validUntil != nil {
		validUntilBig = big.NewInt(validUntil.Unix())
	}

	// Mint on-chain (or simulate)
	onchainTokenID, _, err := h.blockchainClient.GrantPermission(r.Context(), policyHashBytes, agentIDBytes, validFromBig, validUntilBig)
	if err != nil {
		h.logger.Error().Err(err).Str("permission_id", permID.String()).Msg("on-chain minting failed")
		respondError(w, http.StatusInternalServerError, "on-chain minting failed: "+err.Error())
		return
	}

	// Update DB with on-chain token ID
	var perm Permission
	err = h.db.QueryRow(r.Context(),
		`UPDATE permissions SET
			onchain_token_id = $1,
			minted_at = NOW()
		 WHERE id = $2 AND wallet_id = $3 AND status = 'active' AND minted_at IS NULL
		 RETURNING id, wallet_id, agent_id, policy_id, status, onchain_token_id, valid_from, valid_until, created_at, revoked_at, minted_at`,
		onchainTokenID, permID, userID,
	).Scan(&perm.ID, &perm.WalletID, &perm.AgentID, &perm.PolicyID, &perm.Status, &perm.OnchainTokenID, &perm.ValidFrom, &perm.ValidUntil, &perm.CreatedAt, &perm.RevokedAt, &perm.MintedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "permission not found or already minted")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:     userID,
		AgentID:      &perm.AgentID,
		PolicyID:     &perm.PolicyID,
		PermissionID: &permID,
		EventType:    "permission.minted",
		Details:      map[string]interface{}{"token_id": onchainTokenID, "simulated": h.blockchainClient.IsSimulated()},
	})

	// Best-effort constraint sync for smart account agents (Phase 4)
	if h.onchainSyncer != nil {
		if err := h.onchainSyncer.SyncConstraints(r.Context(), permID, perm.AgentID); err != nil {
			h.logger.Error().Err(err).Msg("constraint sync failed (permission still minted)")
		}
	}

	respondJSON(w, http.StatusOK, perm)
}

// unmarshalDefinition is a helper to parse policy definition JSON.
func unmarshalDefinition(data []byte) (map[string]interface{}, error) {
	var def map[string]interface{}
	err := json.Unmarshal(data, &def)
	return def, err
}
