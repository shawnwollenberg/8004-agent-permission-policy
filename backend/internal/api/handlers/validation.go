package handlers

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/domain/audit"
	"github.com/erc8004/policy-saas/internal/domain/policy"
)

type ValidateRequest struct {
	AgentID uuid.UUID     `json:"agent_id"`
	Action  policy.Action `json:"action"`
}

type ValidateResponse struct {
	Allowed      bool                   `json:"allowed"`
	Reason       string                 `json:"reason,omitempty"`
	PermissionID *uuid.UUID             `json:"permission_id,omitempty"`
	PolicyID     *uuid.UUID             `json:"policy_id,omitempty"`
	Constraints  map[string]interface{} `json:"constraints,omitempty"`
	RequestID    uuid.UUID              `json:"request_id"`
}

func (h *Handlers) ValidateAction(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req ValidateRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	requestID := uuid.New()
	startTime := time.Now()

	result := h.policyEngine.Validate(r.Context(), userID, req.AgentID, req.Action)

	// Log the validation request
	h.db.Exec(r.Context(),
		`INSERT INTO validation_requests (id, wallet_id, agent_id, action_type, action_data, allowed, reason, permission_id, policy_id, latency_ms)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		requestID, userID, req.AgentID, req.Action.Type, req.Action, result.Allowed, result.Reason, result.PermissionID, result.PolicyID, time.Since(startTime).Milliseconds(),
	)

	h.auditLogger.Log(r.Context(), audit.Event{
		WalletID:     userID,
		AgentID:      &req.AgentID,
		PolicyID:     result.PolicyID,
		PermissionID: result.PermissionID,
		EventType:    "validation.request",
		Details: map[string]interface{}{
			"action":     req.Action,
			"allowed":    result.Allowed,
			"reason":     result.Reason,
			"request_id": requestID,
		},
	})

	respondJSON(w, http.StatusOK, ValidateResponse{
		Allowed:      result.Allowed,
		Reason:       result.Reason,
		PermissionID: result.PermissionID,
		PolicyID:     result.PolicyID,
		Constraints:  result.Constraints,
		RequestID:    requestID,
	})
}

type BatchValidateRequest struct {
	Requests []ValidateRequest `json:"requests"`
}

type BatchValidateResponse struct {
	Results []ValidateResponse `json:"results"`
}

func (h *Handlers) ValidateBatch(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req BatchValidateRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Requests) > 100 {
		respondError(w, http.StatusBadRequest, "max 100 requests per batch")
		return
	}

	var results []ValidateResponse
	for _, vReq := range req.Requests {
		requestID := uuid.New()
		startTime := time.Now()

		result := h.policyEngine.Validate(r.Context(), userID, vReq.AgentID, vReq.Action)

		h.db.Exec(r.Context(),
			`INSERT INTO validation_requests (id, wallet_id, agent_id, action_type, action_data, allowed, reason, permission_id, policy_id, latency_ms)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			requestID, userID, vReq.AgentID, vReq.Action.Type, vReq.Action, result.Allowed, result.Reason, result.PermissionID, result.PolicyID, time.Since(startTime).Milliseconds(),
		)

		results = append(results, ValidateResponse{
			Allowed:      result.Allowed,
			Reason:       result.Reason,
			PermissionID: result.PermissionID,
			PolicyID:     result.PolicyID,
			Constraints:  result.Constraints,
			RequestID:    requestID,
		})
	}

	respondJSON(w, http.StatusOK, BatchValidateResponse{Results: results})
}

type SimulateRequest struct {
	AgentID uuid.UUID     `json:"agent_id"`
	Action  policy.Action `json:"action"`
}

type SimulateResponse struct {
	WouldAllow      bool                   `json:"would_allow"`
	Reason          string                 `json:"reason,omitempty"`
	MatchingPolicy  *uuid.UUID             `json:"matching_policy,omitempty"`
	CurrentUsage    map[string]interface{} `json:"current_usage,omitempty"`
	RemainingQuota  map[string]interface{} `json:"remaining_quota,omitempty"`
	Recommendations []string               `json:"recommendations,omitempty"`
}

func (h *Handlers) SimulateAction(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req SimulateRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	result := h.policyEngine.Simulate(r.Context(), userID, req.AgentID, req.Action)

	respondJSON(w, http.StatusOK, SimulateResponse{
		WouldAllow:      result.WouldAllow,
		Reason:          result.Reason,
		MatchingPolicy:  result.MatchingPolicy,
		CurrentUsage:    result.CurrentUsage,
		RemainingQuota:  result.RemainingQuota,
		Recommendations: result.Recommendations,
	})
}
