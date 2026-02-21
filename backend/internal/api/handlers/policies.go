package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/blockchain"
	"github.com/erc8004/policy-saas/internal/domain/audit"
	"github.com/erc8004/policy-saas/internal/domain/policy"
)

type Policy struct {
	ID              uuid.UUID            `json:"id"`
	WalletID        uuid.UUID            `json:"wallet_id"`
	Name            string               `json:"name"`
	Description     string               `json:"description,omitempty"`
	Definition      policy.Definition    `json:"definition"`
	Status          string               `json:"status"`
	Version         int                  `json:"version"`
	OnchainHash     *string              `json:"onchain_hash,omitempty"`
	CreatedAt       time.Time            `json:"created_at"`
	UpdatedAt       time.Time            `json:"updated_at"`
	ActivatedAt     *time.Time           `json:"activated_at,omitempty"`
	RevokedAt       *time.Time           `json:"revoked_at,omitempty"`
}

type CreatePolicyRequest struct {
	Name        string            `json:"name"`
	Description string            `json:"description,omitempty"`
	Definition  policy.Definition `json:"definition"`
}

func (h *Handlers) CreatePolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreatePolicyRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "name is required")
		return
	}

	// Validate the policy definition
	if err := h.policyEngine.ValidateDefinition(&req.Definition); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	defBytes, _ := json.Marshal(req.Definition)

	var p Policy
	err := h.db.QueryRow(r.Context(),
		`INSERT INTO policies (wallet_id, name, description, definition, status, version)
		 VALUES ($1, $2, $3, $4, 'draft', 1)
		 RETURNING id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at`,
		userID, req.Name, req.Description, defBytes,
	).Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &defBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to create policy")
		respondError(w, http.StatusInternalServerError, "failed to create policy")
		return
	}
	json.Unmarshal(defBytes, &p.Definition)

	// Record version
	h.db.Exec(r.Context(),
		`INSERT INTO policy_versions (policy_id, version, definition, created_by)
		 VALUES ($1, $2, $3, $4)`,
		p.ID, 1, defBytes, userID,
	)

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		PolicyID:  &p.ID,
		EventType: "policy.created",
		Details:   map[string]interface{}{"name": req.Name},
	})

	respondJSON(w, http.StatusCreated, p)
}

func (h *Handlers) ListPolicies(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	rows, err := h.db.Query(r.Context(),
		`SELECT id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at
		 FROM policies WHERE wallet_id = $1 AND status != 'deleted'
		 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list policies")
		return
	}
	defer rows.Close()

	var policies []Policy
	for rows.Next() {
		var p Policy
		var defBytes []byte
		if err := rows.Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &defBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt); err != nil {
			continue
		}
		json.Unmarshal(defBytes, &p.Definition)
		policies = append(policies, p)
	}

	if policies == nil {
		policies = []Policy{}
	}

	respondJSON(w, http.StatusOK, policies)
}

func (h *Handlers) GetPolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	policyIDStr := r.PathValue("id")

	policyID, err := uuid.Parse(policyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid policy id")
		return
	}

	var p Policy
	var defBytes []byte
	err = h.db.QueryRow(r.Context(),
		`SELECT id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at
		 FROM policies WHERE id = $1 AND wallet_id = $2 AND status != 'deleted'`,
		policyID, userID,
	).Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &defBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found")
		return
	}
	json.Unmarshal(defBytes, &p.Definition)

	respondJSON(w, http.StatusOK, p)
}

type UpdatePolicyRequest struct {
	Name        *string            `json:"name,omitempty"`
	Description *string            `json:"description,omitempty"`
	Definition  *policy.Definition `json:"definition,omitempty"`
}

func (h *Handlers) UpdatePolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	policyIDStr := r.PathValue("id")

	policyID, err := uuid.Parse(policyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid policy id")
		return
	}

	var req UpdatePolicyRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Check if policy exists and is in draft status
	var currentStatus string
	var currentVersion int
	err = h.db.QueryRow(r.Context(),
		`SELECT status, version FROM policies WHERE id = $1 AND wallet_id = $2 AND status != 'deleted'`,
		policyID, userID,
	).Scan(&currentStatus, &currentVersion)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found")
		return
	}

	// Can only update draft policies directly; active policies create new version
	newVersion := currentVersion
	if currentStatus == "active" && req.Definition != nil {
		newVersion = currentVersion + 1
	}

	var defBytes []byte
	if req.Definition != nil {
		if err := h.policyEngine.ValidateDefinition(req.Definition); err != nil {
			respondError(w, http.StatusBadRequest, err.Error())
			return
		}
		defBytes, _ = json.Marshal(req.Definition)
	}

	var p Policy
	var resultDefBytes []byte
	err = h.db.QueryRow(r.Context(),
		`UPDATE policies SET
			name = COALESCE($1, name),
			description = COALESCE($2, description),
			definition = COALESCE($3, definition),
			version = $4,
			updated_at = NOW()
		 WHERE id = $5 AND wallet_id = $6 AND status != 'deleted'
		 RETURNING id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at`,
		req.Name, req.Description, defBytes, newVersion, policyID, userID,
	).Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &resultDefBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update policy")
		return
	}
	json.Unmarshal(resultDefBytes, &p.Definition)

	// Record version if definition changed
	if req.Definition != nil {
		h.db.Exec(r.Context(),
			`INSERT INTO policy_versions (policy_id, version, definition, created_by)
			 VALUES ($1, $2, $3, $4)`,
			p.ID, newVersion, defBytes, userID,
		)
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		PolicyID:  &policyID,
		EventType: "policy.updated",
		Details:   map[string]interface{}{"version": newVersion},
	})

	respondJSON(w, http.StatusOK, p)
}

func (h *Handlers) DeletePolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	policyIDStr := r.PathValue("id")

	policyID, err := uuid.Parse(policyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid policy id")
		return
	}

	result, err := h.db.Exec(r.Context(),
		`UPDATE policies SET status = 'deleted', updated_at = NOW() WHERE id = $1 AND wallet_id = $2 AND status != 'deleted'`,
		policyID, userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete policy")
		return
	}

	if result.RowsAffected() == 0 {
		respondError(w, http.StatusNotFound, "policy not found")
		return
	}

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		PolicyID:  &policyID,
		EventType: "policy.deleted",
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) ActivatePolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	policyIDStr := r.PathValue("id")

	policyID, err := uuid.Parse(policyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid policy id")
		return
	}

	// Get the policy definition before activating (needed for on-chain hash)
	var defBytes []byte
	err = h.db.QueryRow(r.Context(),
		`SELECT definition FROM policies WHERE id = $1 AND wallet_id = $2 AND status = 'draft'`,
		policyID, userID,
	).Scan(&defBytes)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found or already active")
		return
	}

	// Register the policy on-chain via PolicyRegistry.createPolicy(contentHash)
	contentHash := blockchain.PolicyContentHash(defBytes)
	onchainPolicyID, txHash, err := h.chainClients.Primary().CreatePolicy(r.Context(), contentHash)
	if err != nil {
		h.logger.Error().Err(err).Str("policy_id", policyID.String()).Msg("on-chain policy creation failed")
		respondError(w, http.StatusInternalServerError, "on-chain policy creation failed: "+err.Error())
		return
	}

	h.logger.Info().
		Str("policy_id", policyID.String()).
		Str("onchain_policy_id", onchainPolicyID).
		Str("tx_hash", txHash).
		Msg("policy registered on-chain")

	// Activate in DB and store the on-chain hash
	var p Policy
	err = h.db.QueryRow(r.Context(),
		`UPDATE policies SET status = 'active', activated_at = NOW(), updated_at = NOW(), onchain_hash = $1
		 WHERE id = $2 AND wallet_id = $3 AND status = 'draft'
		 RETURNING id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at`,
		onchainPolicyID, policyID, userID,
	).Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &defBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found or already active")
		return
	}
	json.Unmarshal(defBytes, &p.Definition)

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		PolicyID:  &policyID,
		EventType: "policy.activated",
		Details:   map[string]interface{}{"onchain_hash": onchainPolicyID, "tx_hash": txHash, "simulated": h.chainClients.Primary().IsSimulated()},
	})

	respondJSON(w, http.StatusOK, p)
}

func (h *Handlers) RevokePolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	policyIDStr := r.PathValue("id")

	policyID, err := uuid.Parse(policyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid policy id")
		return
	}

	// Get the on-chain hash before revoking (needed for deactivatePolicy call)
	var onchainHash *string
	h.db.QueryRow(r.Context(),
		`SELECT onchain_hash FROM policies WHERE id = $1 AND wallet_id = $2 AND status = 'active'`,
		policyID, userID,
	).Scan(&onchainHash)

	// Deactivate on-chain if the policy was registered
	if onchainHash != nil && *onchainHash != "" {
		policyIDBytes, decErr := blockchain.HexToBytes32(*onchainHash)
		if decErr == nil {
			txHash, bcErr := h.chainClients.Primary().DeactivatePolicy(r.Context(), policyIDBytes)
			if bcErr != nil {
				h.logger.Error().Err(bcErr).Str("policy_id", policyID.String()).Msg("on-chain policy deactivation failed (continuing with DB revoke)")
			} else {
				h.logger.Info().Str("policy_id", policyID.String()).Str("tx_hash", txHash).Msg("policy deactivated on-chain")
			}
		}
	}

	var p Policy
	var defBytes []byte
	err = h.db.QueryRow(r.Context(),
		`UPDATE policies SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND wallet_id = $2 AND status = 'active'
		 RETURNING id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at`,
		policyID, userID,
	).Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &defBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found or not active")
		return
	}
	json.Unmarshal(defBytes, &p.Definition)

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		PolicyID:  &policyID,
		EventType: "policy.revoked",
	})

	respondJSON(w, http.StatusOK, p)
}

func (h *Handlers) ReactivatePolicy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	policyIDStr := r.PathValue("id")

	policyID, err := uuid.Parse(policyIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid policy id")
		return
	}

	// Verify the policy is currently revoked and get its on-chain hash
	var onchainHash *string
	err = h.db.QueryRow(r.Context(),
		`SELECT onchain_hash FROM policies WHERE id = $1 AND wallet_id = $2 AND status = 'revoked'`,
		policyID, userID,
	).Scan(&onchainHash)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found or not revoked")
		return
	}

	// Reactivate on-chain if the policy was previously registered
	if onchainHash != nil && *onchainHash != "" {
		policyIDBytes, decErr := blockchain.HexToBytes32(*onchainHash)
		if decErr == nil {
			txHash, bcErr := h.chainClients.Primary().ReactivatePolicy(r.Context(), policyIDBytes)
			if bcErr != nil {
				h.logger.Error().Err(bcErr).Str("policy_id", policyID.String()).Msg("on-chain policy reactivation failed")
				respondError(w, http.StatusInternalServerError, "on-chain policy reactivation failed: "+bcErr.Error())
				return
			}
			h.logger.Info().Str("policy_id", policyID.String()).Str("tx_hash", txHash).Msg("policy reactivated on-chain")
		}
	}

	// Reactivate in DB
	var p Policy
	var defBytes []byte
	err = h.db.QueryRow(r.Context(),
		`UPDATE policies SET status = 'active', revoked_at = NULL, updated_at = NOW()
		 WHERE id = $1 AND wallet_id = $2 AND status = 'revoked'
		 RETURNING id, wallet_id, name, description, definition, status, version, onchain_hash, created_at, updated_at, activated_at, revoked_at`,
		policyID, userID,
	).Scan(&p.ID, &p.WalletID, &p.Name, &p.Description, &defBytes, &p.Status, &p.Version, &p.OnchainHash, &p.CreatedAt, &p.UpdatedAt, &p.ActivatedAt, &p.RevokedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "policy not found or not revoked")
		return
	}
	json.Unmarshal(defBytes, &p.Definition)

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:  userID,
		PolicyID:  &policyID,
		EventType: "policy.reactivated",
		Details:   map[string]interface{}{"simulated": h.chainClients.Primary().IsSimulated()},
	})

	respondJSON(w, http.StatusOK, p)
}
