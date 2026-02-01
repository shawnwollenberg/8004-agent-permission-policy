package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/domain/audit"
)

type Agent struct {
	ID                   uuid.UUID  `json:"id"`
	WalletID             uuid.UUID  `json:"wallet_id"`
	Name                 string     `json:"name"`
	Description          string     `json:"description,omitempty"`
	AgentAddress         *string    `json:"agent_address,omitempty"`
	OnchainRegistryID    *string    `json:"onchain_registry_id,omitempty"`
	Status               string     `json:"status"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	OnchainRegisteredAt  *time.Time `json:"onchain_registered_at,omitempty"`
}

type CreateAgentRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	AgentAddress string `json:"agent_address,omitempty"`
}

func (h *Handlers) CreateAgent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateAgentRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "name is required")
		return
	}

	var agent Agent
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO agents (wallet_id, name, description, agent_address, status)
		 VALUES ($1, $2, $3, $4, 'active')
		 RETURNING id, wallet_id, name, description, agent_address, status, created_at, updated_at`,
		userID, req.Name, req.Description, nilIfEmpty(req.AgentAddress),
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.Status, &agent.CreatedAt, &agent.UpdatedAt)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to create agent")
		respondError(w, http.StatusInternalServerError, "failed to create agent")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		AgentID:   &agent.ID,
		EventType: "agent.created",
		Details:   map[string]interface{}{"name": req.Name},
	})

	respondJSON(w, http.StatusCreated, agent)
}

func (h *Handlers) ListAgents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, wallet_id, name, description, agent_address, onchain_registry_id, status, created_at, updated_at, onchain_registered_at
		 FROM agents WHERE wallet_id = $1 AND status != 'deleted'
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list agents")
		return
	}
	defer rows.Close()

	var agents []Agent
	for rows.Next() {
		var a Agent
		if err := rows.Scan(&a.ID, &a.WalletID, &a.Name, &a.Description, &a.AgentAddress, &a.OnchainRegistryID, &a.Status, &a.CreatedAt, &a.UpdatedAt, &a.OnchainRegisteredAt); err != nil {
			continue
		}
		agents = append(agents, a)
	}

	if agents == nil {
		agents = []Agent{}
	}

	respondJSON(w, http.StatusOK, agents)
}

func (h *Handlers) GetAgent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	agentIDStr := r.PathValue("id")

	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid agent id")
		return
	}

	var agent Agent
	err = h.db.QueryRow(r.Context(),
		`SELECT id, wallet_id, name, description, agent_address, onchain_registry_id, status, created_at, updated_at, onchain_registered_at
		 FROM agents WHERE id = $1 AND wallet_id = $2 AND status != 'deleted'`,
		agentID, userID,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.OnchainRegistryID, &agent.Status, &agent.CreatedAt, &agent.UpdatedAt, &agent.OnchainRegisteredAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "agent not found")
		return
	}

	respondJSON(w, http.StatusOK, agent)
}

type UpdateAgentRequest struct {
	Name         *string `json:"name,omitempty"`
	Description  *string `json:"description,omitempty"`
	AgentAddress *string `json:"agent_address,omitempty"`
	Status       *string `json:"status,omitempty"`
}

func (h *Handlers) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	agentIDStr := r.PathValue("id")

	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid agent id")
		return
	}

	var req UpdateAgentRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var agent Agent
	err = h.db.QueryRow(r.Context(),
		`UPDATE agents SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			agent_address = COALESCE($3, agent_address),
			status = COALESCE($4, status),
			updated_at = NOW()
		 WHERE id = $5 AND wallet_id = $6 AND status != 'deleted'
		 RETURNING id, wallet_id, name, description, agent_address, onchain_registry_id, status, created_at, updated_at, onchain_registered_at`,
		req.Name, req.Description, req.AgentAddress, req.Status, agentID, userID,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.OnchainRegistryID, &agent.Status, &agent.CreatedAt, &agent.UpdatedAt, &agent.OnchainRegisteredAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "agent not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		AgentID:   &agentID,
		EventType: "agent.updated",
		Details:   map[string]interface{}{"changes": req},
	})

	respondJSON(w, http.StatusOK, agent)
}

func (h *Handlers) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	agentIDStr := r.PathValue("id")

	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid agent id")
		return
	}

	result, err := h.db.Exec(r.Context(),
		`UPDATE agents SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND wallet_id = $2 AND status != 'deleted'`,
		agentID, userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete agent")
		return
	}

	if result.RowsAffected() == 0 {
		respondError(w, http.StatusNotFound, "agent not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		AgentID:   &agentID,
		EventType: "agent.deleted",
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) RegisterAgentOnchain(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	agentIDStr := r.PathValue("id")

	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid agent id")
		return
	}

	// TODO: Implement actual on-chain registration via ERC-8004 Identity Registry
	// For now, simulate the registration

	var agent Agent
	err = h.db.QueryRow(r.Context(),
		`UPDATE agents SET
			onchain_registry_id = $1,
			onchain_registered_at = NOW(),
			updated_at = NOW()
		 WHERE id = $2 AND wallet_id = $3 AND status != 'deleted'
		 RETURNING id, wallet_id, name, description, agent_address, onchain_registry_id, status, created_at, updated_at, onchain_registered_at`,
		"simulated-registry-id-"+agentID.String()[:8], agentID, userID,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.OnchainRegistryID, &agent.Status, &agent.CreatedAt, &agent.UpdatedAt, &agent.OnchainRegisteredAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "agent not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		AgentID:   &agentID,
		EventType: "agent.registered_onchain",
		Details:   map[string]interface{}{"registry_id": agent.OnchainRegistryID},
	})

	respondJSON(w, http.StatusOK, agent)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
