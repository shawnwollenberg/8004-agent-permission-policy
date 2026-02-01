package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/domain/audit"
)

type Webhook struct {
	ID         uuid.UUID  `json:"id"`
	WalletID   uuid.UUID  `json:"wallet_id"`
	Name       string     `json:"name"`
	URL        string     `json:"url"`
	Secret     string     `json:"secret,omitempty"`
	Events     []string   `json:"events"`
	Active     bool       `json:"active"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	LastCallAt *time.Time `json:"last_call_at,omitempty"`
}

type CreateWebhookRequest struct {
	Name   string   `json:"name"`
	URL    string   `json:"url"`
	Events []string `json:"events"`
}

func (h *Handlers) CreateWebhook(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateWebhookRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.URL == "" || len(req.Events) == 0 {
		respondError(w, http.StatusBadRequest, "name, url, and events are required")
		return
	}

	// Generate webhook secret
	secretBytes := make([]byte, 32)
	rand.Read(secretBytes)
	secret := "whsec_" + hex.EncodeToString(secretBytes)

	var wh Webhook
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO webhooks (wallet_id, name, url, secret, events, active)
		 VALUES ($1, $2, $3, $4, $5, true)
		 RETURNING id, wallet_id, name, url, secret, events, active, created_at, updated_at, last_call_at`,
		userID, req.Name, req.URL, secret, req.Events,
	).Scan(&wh.ID, &wh.WalletID, &wh.Name, &wh.URL, &wh.Secret, &wh.Events, &wh.Active, &wh.CreatedAt, &wh.UpdatedAt, &wh.LastCallAt)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to create webhook")
		respondError(w, http.StatusInternalServerError, "failed to create webhook")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		EventType: "webhook.created",
		Details:   map[string]interface{}{"webhook_id": wh.ID, "name": req.Name},
	})

	respondJSON(w, http.StatusCreated, wh)
}

func (h *Handlers) ListWebhooks(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, wallet_id, name, url, events, active, created_at, updated_at, last_call_at
		 FROM webhooks WHERE wallet_id = $1
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list webhooks")
		return
	}
	defer rows.Close()

	var webhooks []Webhook
	for rows.Next() {
		var wh Webhook
		if err := rows.Scan(&wh.ID, &wh.WalletID, &wh.Name, &wh.URL, &wh.Events, &wh.Active, &wh.CreatedAt, &wh.UpdatedAt, &wh.LastCallAt); err != nil {
			continue
		}
		webhooks = append(webhooks, wh)
	}

	if webhooks == nil {
		webhooks = []Webhook{}
	}

	respondJSON(w, http.StatusOK, webhooks)
}

func (h *Handlers) GetWebhook(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	webhookIDStr := r.PathValue("id")

	webhookID, err := uuid.Parse(webhookIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid webhook id")
		return
	}

	var wh Webhook
	err = h.db.QueryRow(r.Context(),
		`SELECT id, wallet_id, name, url, secret, events, active, created_at, updated_at, last_call_at
		 FROM webhooks WHERE id = $1 AND wallet_id = $2`,
		webhookID, userID,
	).Scan(&wh.ID, &wh.WalletID, &wh.Name, &wh.URL, &wh.Secret, &wh.Events, &wh.Active, &wh.CreatedAt, &wh.UpdatedAt, &wh.LastCallAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "webhook not found")
		return
	}

	respondJSON(w, http.StatusOK, wh)
}

type UpdateWebhookRequest struct {
	Name   *string   `json:"name,omitempty"`
	URL    *string   `json:"url,omitempty"`
	Events *[]string `json:"events,omitempty"`
	Active *bool     `json:"active,omitempty"`
}

func (h *Handlers) UpdateWebhook(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	webhookIDStr := r.PathValue("id")

	webhookID, err := uuid.Parse(webhookIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid webhook id")
		return
	}

	var req UpdateWebhookRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var wh Webhook
	err = h.db.QueryRow(r.Context(),
		`UPDATE webhooks SET
			name = COALESCE($1, name),
			url = COALESCE($2, url),
			events = COALESCE($3, events),
			active = COALESCE($4, active),
			updated_at = NOW()
		 WHERE id = $5 AND wallet_id = $6
		 RETURNING id, wallet_id, name, url, events, active, created_at, updated_at, last_call_at`,
		req.Name, req.URL, req.Events, req.Active, webhookID, userID,
	).Scan(&wh.ID, &wh.WalletID, &wh.Name, &wh.URL, &wh.Events, &wh.Active, &wh.CreatedAt, &wh.UpdatedAt, &wh.LastCallAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "webhook not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		EventType: "webhook.updated",
		Details:   map[string]interface{}{"webhook_id": webhookID},
	})

	respondJSON(w, http.StatusOK, wh)
}

func (h *Handlers) DeleteWebhook(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	webhookIDStr := r.PathValue("id")

	webhookID, err := uuid.Parse(webhookIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid webhook id")
		return
	}

	result, err := h.db.Exec(r.Context(),
		`DELETE FROM webhooks WHERE id = $1 AND wallet_id = $2`,
		webhookID, userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete webhook")
		return
	}

	if result.RowsAffected() == 0 {
		respondError(w, http.StatusNotFound, "webhook not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		EventType: "webhook.deleted",
		Details:   map[string]interface{}{"webhook_id": webhookID},
	})

	w.WriteHeader(http.StatusNoContent)
}
