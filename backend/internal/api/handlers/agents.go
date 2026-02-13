package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/blockchain"
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
	WalletType           string     `json:"wallet_type"`
	EnforcementLevel     string     `json:"enforcement_level"`
	SmartAccountAddress  *string    `json:"smart_account_address,omitempty"`
	SignerAddress        *string    `json:"signer_address,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	OnchainRegisteredAt  *time.Time `json:"onchain_registered_at,omitempty"`
}

type CreateAgentRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	AgentAddress string `json:"agent_address,omitempty"`
	WalletType   string `json:"wallet_type,omitempty"`
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

	walletType := "eoa"
	enforcementLevel := "advisory"
	if req.WalletType == "smart_account" {
		walletType = "smart_account"
		enforcementLevel = "enforced"
	}

	var agent Agent
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO agents (wallet_id, name, description, agent_address, status, wallet_type, enforcement_level)
		 VALUES ($1, $2, $3, $4, 'active', $5, $6)
		 RETURNING id, wallet_id, name, description, agent_address, status, wallet_type, enforcement_level, created_at, updated_at`,
		userID, req.Name, req.Description, nilIfEmpty(req.AgentAddress), walletType, enforcementLevel,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.Status, &agent.WalletType, &agent.EnforcementLevel, &agent.CreatedAt, &agent.UpdatedAt)
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
		`SELECT a.id, a.wallet_id, a.name, a.description, a.agent_address, a.onchain_registry_id,
		        a.status, a.wallet_type, a.enforcement_level, a.created_at, a.updated_at,
		        a.onchain_registered_at, sa.account_address, sa.signer_address
		 FROM agents a
		 LEFT JOIN smart_accounts sa ON sa.agent_id = a.id
		 WHERE a.wallet_id = $1 AND a.status != 'deleted'
		 ORDER BY a.created_at DESC`,
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
		if err := rows.Scan(&a.ID, &a.WalletID, &a.Name, &a.Description, &a.AgentAddress, &a.OnchainRegistryID,
			&a.Status, &a.WalletType, &a.EnforcementLevel, &a.CreatedAt, &a.UpdatedAt,
			&a.OnchainRegisteredAt, &a.SmartAccountAddress, &a.SignerAddress); err != nil {
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
		`SELECT a.id, a.wallet_id, a.name, a.description, a.agent_address, a.onchain_registry_id,
		        a.status, a.wallet_type, a.enforcement_level, a.created_at, a.updated_at,
		        a.onchain_registered_at, sa.account_address, sa.signer_address
		 FROM agents a
		 LEFT JOIN smart_accounts sa ON sa.agent_id = a.id
		 WHERE a.id = $1 AND a.wallet_id = $2 AND a.status != 'deleted'`,
		agentID, userID,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.OnchainRegistryID,
		&agent.Status, &agent.WalletType, &agent.EnforcementLevel, &agent.CreatedAt, &agent.UpdatedAt,
		&agent.OnchainRegisteredAt, &agent.SmartAccountAddress, &agent.SignerAddress)
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
		 RETURNING id, wallet_id, name, description, agent_address, onchain_registry_id, status, wallet_type, enforcement_level, created_at, updated_at, onchain_registered_at`,
		req.Name, req.Description, req.AgentAddress, req.Status, agentID, userID,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.OnchainRegistryID, &agent.Status, &agent.WalletType, &agent.EnforcementLevel, &agent.CreatedAt, &agent.UpdatedAt, &agent.OnchainRegisteredAt)
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

	// Check if already registered on-chain
	var existingRegistryID *string
	h.db.QueryRow(r.Context(),
		`SELECT onchain_registry_id FROM agents WHERE id = $1 AND wallet_id = $2`,
		agentID, userID,
	).Scan(&existingRegistryID)
	if existingRegistryID != nil && *existingRegistryID != "" {
		respondError(w, http.StatusConflict, "agent is already registered on-chain")
		return
	}

	// Register agent on-chain via IdentityRegistry (or simulate)
	agentIDBytes := blockchain.UUIDToBytes32(agentID.String())
	registryID, err := h.blockchainClient.RegisterAgent(r.Context(), agentIDBytes, agentID.String())
	if err != nil {
		// Handle AgentAlreadyExists revert — treat as success
		if strings.Contains(err.Error(), "AgentAlreadyExists") {
			h.logger.Info().Str("agent_id", agentID.String()).Msg("agent already registered on-chain, updating local record")
			registryID = "0x" + agentID.String()
		} else {
			h.logger.Error().Err(err).Str("agent_id", agentID.String()).Msg("on-chain registration failed")
			respondError(w, http.StatusInternalServerError, "on-chain registration failed: "+err.Error())
			return
		}
	}

	var agent Agent
	err = h.db.QueryRow(r.Context(),
		`UPDATE agents SET
			onchain_registry_id = $1,
			onchain_registered_at = NOW(),
			updated_at = NOW()
		 WHERE id = $2 AND wallet_id = $3 AND status != 'deleted'
		 RETURNING id, wallet_id, name, description, agent_address, onchain_registry_id, status, wallet_type, enforcement_level, created_at, updated_at, onchain_registered_at`,
		registryID, agentID, userID,
	).Scan(&agent.ID, &agent.WalletID, &agent.Name, &agent.Description, &agent.AgentAddress, &agent.OnchainRegistryID, &agent.Status, &agent.WalletType, &agent.EnforcementLevel, &agent.CreatedAt, &agent.UpdatedAt, &agent.OnchainRegisteredAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "agent not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		AgentID:   &agentID,
		EventType: "agent.registered_onchain",
		Details:   map[string]interface{}{"registry_id": registryID, "simulated": h.blockchainClient.IsSimulated()},
	})

	respondJSON(w, http.StatusOK, agent)
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
