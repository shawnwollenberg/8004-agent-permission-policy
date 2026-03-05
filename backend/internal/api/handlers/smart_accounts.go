package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/blockchain"
	"github.com/erc8004/policy-saas/internal/domain/audit"
)

type SmartAccount struct {
	ID                uuid.UUID  `json:"id"`
	AgentID           uuid.UUID  `json:"agent_id"`
	WalletID          uuid.UUID  `json:"wallet_id"`
	AccountAddress    string     `json:"account_address"`
	FactoryAddress    string     `json:"factory_address"`
	SignerAddress     string     `json:"signer_address"`
	Salt              string     `json:"salt"`
	Deployed          bool       `json:"deployed"`
	DeployTxHash      *string    `json:"deploy_tx_hash,omitempty"`
	EntrypointAddress string     `json:"entrypoint_address"`
	ChainID           int        `json:"chain_id"`
	SignerType        string     `json:"signer_type"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	DeployedAt        *time.Time `json:"deployed_at,omitempty"`
}

type DeploySmartAccountRequest struct {
	SignerAddress string `json:"signer_address"`
	SignerType    string `json:"signer_type,omitempty"`
	ChainID      int64  `json:"chain_id,omitempty"`
}

// DeploySmartAccount deploys a new ERC-4337 smart account for an agent.
// POST /api/v1/agents/{id}/deploy-smart-account
func (h *Handlers) DeploySmartAccount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	agentIDStr := r.PathValue("id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid agent id")
		return
	}

	var req DeploySmartAccountRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.SignerAddress == "" {
		respondError(w, http.StatusBadRequest, "signer_address is required")
		return
	}

	signerType := "wallet"
	if req.SignerType == "generated" {
		signerType = "generated"
	}

	// Verify agent belongs to user and is active
	var agentStatus string
	var existingWalletType string
	err = h.db.QueryRow(r.Context(),
		`SELECT status, wallet_type FROM agents WHERE id = $1 AND wallet_id = $2 AND status != 'deleted'`,
		agentID, userID,
	).Scan(&agentStatus, &existingWalletType)
	if err != nil {
		respondError(w, http.StatusNotFound, "agent not found")
		return
	}

	if agentStatus != "active" {
		respondError(w, http.StatusBadRequest, "agent must be active to deploy smart account")
		return
	}

	// Check for existing smart account
	var existingCount int
	h.db.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM smart_accounts WHERE agent_id = $1`, agentID,
	).Scan(&existingCount)
	if existingCount > 0 {
		respondError(w, http.StatusConflict, "agent already has a smart account")
		return
	}

	// Resolve blockchain client for requested chain
	bc := h.clientForChain(req.ChainID)

	// Generate deterministic salt from agent UUID
	saltBytes := sha256.Sum256([]byte(agentID.String()))
	salt := "0x" + hex.EncodeToString(saltBytes[:])

	// Compute predicted address and optionally deploy on-chain
	agentIDBytes32 := blockchain.UUIDToBytes32(agentID.String())
	var predictedAddress string
	var deployTxHash *string
	deployed := false

	if !bc.IsSimulated() {
		// Live mode: deploy on-chain
		owner := common.HexToAddress(req.SignerAddress)
		addr, txHash, err := bc.CreateSmartAccount(r.Context(), owner, agentIDBytes32, saltBytes)
		if err != nil {
			h.logger.Error().Err(err).Msg("on-chain smart account deployment failed")
			respondError(w, http.StatusInternalServerError, "on-chain deployment failed: "+err.Error())
			return
		}
		predictedAddress = addr
		deployTxHash = &txHash
		deployed = true
	} else {
		// Simulated mode: compute deterministic address
		addr, err := bc.ComputeSmartAccountAddress(req.SignerAddress, agentID.String(), salt)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "failed to compute address")
			return
		}
		predictedAddress = addr
	}

	factoryAddress := bc.FactoryAddress()
	if factoryAddress == "" {
		factoryAddress = "0x0000000000000000000000000000000000000000"
	}
	entrypointAddress := bc.EntryPointAddress()
	chainID := bc.ChainID()

	// Insert smart account record
	var sa SmartAccount
	err = h.db.QueryRow(r.Context(),
		`INSERT INTO smart_accounts (agent_id, wallet_id, account_address, factory_address, signer_address, salt, deployed, deploy_tx_hash, entrypoint_address, chain_id, signer_type, deployed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CASE WHEN $7 THEN NOW() ELSE NULL END)
		 RETURNING id, agent_id, wallet_id, account_address, factory_address, signer_address, salt, deployed, deploy_tx_hash, entrypoint_address, chain_id, signer_type, created_at, updated_at, deployed_at`,
		agentID, userID, predictedAddress, factoryAddress, req.SignerAddress, salt, deployed, deployTxHash, entrypointAddress, chainID, signerType,
	).Scan(&sa.ID, &sa.AgentID, &sa.WalletID, &sa.AccountAddress, &sa.FactoryAddress, &sa.SignerAddress, &sa.Salt, &sa.Deployed, &sa.DeployTxHash, &sa.EntrypointAddress, &sa.ChainID, &sa.SignerType, &sa.CreatedAt, &sa.UpdatedAt, &sa.DeployedAt)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to create smart account record")
		respondError(w, http.StatusInternalServerError, "failed to create smart account")
		return
	}

	// Update agent to smart_account type with enforced level
	_, err = h.db.Exec(r.Context(),
		`UPDATE agents SET wallet_type = 'smart_account', enforcement_level = 'enforced', agent_address = $1, updated_at = NOW()
		 WHERE id = $2`,
		predictedAddress, agentID,
	)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to update agent wallet type")
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		AgentID:   &agentID,
		EventType: "agent.smart_account_deployed",
		Details: map[string]interface{}{
			"account_address": predictedAddress,
			"signer_address":  req.SignerAddress,
			"signer_type":     signerType,
			"factory_address": factoryAddress,
			"chain_id":        chainID,
			"deployed":        deployed,
			"simulated":       bc.IsSimulated(),
		},
	})

	respondJSON(w, http.StatusCreated, sa)
}

// GetSmartAccount returns the smart account details for an agent.
// GET /api/v1/agents/{id}/smart-account
func (h *Handlers) GetSmartAccount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	agentIDStr := r.PathValue("id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid agent id")
		return
	}

	var sa SmartAccount
	err = h.db.QueryRow(r.Context(),
		`SELECT sa.id, sa.agent_id, sa.wallet_id, sa.account_address, sa.factory_address, sa.signer_address,
		        sa.salt, sa.deployed, sa.deploy_tx_hash, sa.entrypoint_address, sa.chain_id, sa.signer_type,
		        sa.created_at, sa.updated_at, sa.deployed_at
		 FROM smart_accounts sa
		 JOIN agents a ON a.id = sa.agent_id
		 WHERE sa.agent_id = $1 AND a.wallet_id = $2`,
		agentID, userID,
	).Scan(&sa.ID, &sa.AgentID, &sa.WalletID, &sa.AccountAddress, &sa.FactoryAddress, &sa.SignerAddress,
		&sa.Salt, &sa.Deployed, &sa.DeployTxHash, &sa.EntrypointAddress, &sa.ChainID, &sa.SignerType,
		&sa.CreatedAt, &sa.UpdatedAt, &sa.DeployedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "smart account not found")
		return
	}

	respondJSON(w, http.StatusOK, sa)
}


