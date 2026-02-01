package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	"github.com/erc8004/policy-saas/internal/api/middleware"
)

type AuditLogEntry struct {
	ID           uuid.UUID              `json:"id"`
	WalletID     uuid.UUID              `json:"wallet_id"`
	AgentID      *uuid.UUID             `json:"agent_id,omitempty"`
	PolicyID     *uuid.UUID             `json:"policy_id,omitempty"`
	PermissionID *uuid.UUID             `json:"permission_id,omitempty"`
	EventType    string                 `json:"event_type"`
	Details      map[string]interface{} `json:"details,omitempty"`
	IPAddress    *string                `json:"ip_address,omitempty"`
	UserAgent    *string                `json:"user_agent,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
}

func (h *Handlers) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Parse query params
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 1000 {
			limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	eventType := r.URL.Query().Get("event_type")
	agentID := r.URL.Query().Get("agent_id")
	policyID := r.URL.Query().Get("policy_id")
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	query := `SELECT id, wallet_id, agent_id, policy_id, permission_id, event_type, details, ip_address, user_agent, created_at
		 FROM audit_logs WHERE wallet_id = $1`
	args := []interface{}{userID}
	argIdx := 2

	if eventType != "" {
		query += fmt.Sprintf(" AND event_type = $%d", argIdx)
		args = append(args, eventType)
		argIdx++
	}
	if agentID != "" {
		query += fmt.Sprintf(" AND agent_id = $%d", argIdx)
		args = append(args, agentID)
		argIdx++
	}
	if policyID != "" {
		query += fmt.Sprintf(" AND policy_id = $%d", argIdx)
		args = append(args, policyID)
		argIdx++
	}
	if startDate != "" {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, startDate)
		argIdx++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, endDate)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		h.logger.Error().Err(err).Msg("failed to query audit logs")
		respondError(w, http.StatusInternalServerError, "failed to list audit logs")
		return
	}
	defer rows.Close()

	var logs []AuditLogEntry
	for rows.Next() {
		var l AuditLogEntry
		var detailsBytes []byte
		if err := rows.Scan(&l.ID, &l.WalletID, &l.AgentID, &l.PolicyID, &l.PermissionID, &l.EventType, &detailsBytes, &l.IPAddress, &l.UserAgent, &l.CreatedAt); err != nil {
			continue
		}
		if detailsBytes != nil {
			json.Unmarshal(detailsBytes, &l.Details)
		}
		logs = append(logs, l)
	}

	if logs == nil {
		logs = []AuditLogEntry{}
	}

	// Get total count for pagination
	var totalCount int
	h.db.QueryRow(r.Context(), `SELECT COUNT(*) FROM audit_logs WHERE wallet_id = $1`, userID).Scan(&totalCount)

	w.Header().Set("X-Total-Count", strconv.Itoa(totalCount))
	respondJSON(w, http.StatusOK, logs)
}

func (h *Handlers) ExportAuditLogs(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == uuid.Nil {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "json"
	}

	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	query := `SELECT id, wallet_id, agent_id, policy_id, permission_id, event_type, details, ip_address, user_agent, created_at
		 FROM audit_logs WHERE wallet_id = $1`
	args := []interface{}{userID}
	argIdx := 2

	if startDate != "" {
		query += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, startDate)
		argIdx++
	}
	if endDate != "" {
		query += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, endDate)
		argIdx++
	}

	query += " ORDER BY created_at DESC LIMIT 10000"

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to export audit logs")
		return
	}
	defer rows.Close()

	var logs []AuditLogEntry
	for rows.Next() {
		var l AuditLogEntry
		var detailsBytes []byte
		if err := rows.Scan(&l.ID, &l.WalletID, &l.AgentID, &l.PolicyID, &l.PermissionID, &l.EventType, &detailsBytes, &l.IPAddress, &l.UserAgent, &l.CreatedAt); err != nil {
			continue
		}
		if detailsBytes != nil {
			json.Unmarshal(detailsBytes, &l.Details)
		}
		logs = append(logs, l)
	}

	if format == "csv" {
		w.Header().Set("Content-Type", "text/csv")
		w.Header().Set("Content-Disposition", "attachment; filename=audit_logs.csv")

		writer := csv.NewWriter(w)
		writer.Write([]string{"id", "wallet_id", "agent_id", "policy_id", "permission_id", "event_type", "details", "ip_address", "user_agent", "created_at"})

		for _, l := range logs {
			agentID := ""
			if l.AgentID != nil {
				agentID = l.AgentID.String()
			}
			policyID := ""
			if l.PolicyID != nil {
				policyID = l.PolicyID.String()
			}
			permissionID := ""
			if l.PermissionID != nil {
				permissionID = l.PermissionID.String()
			}
			ipAddress := ""
			if l.IPAddress != nil {
				ipAddress = *l.IPAddress
			}
			userAgent := ""
			if l.UserAgent != nil {
				userAgent = *l.UserAgent
			}
			detailsStr := ""
			if l.Details != nil {
				detailsBytes, _ := json.Marshal(l.Details)
				detailsStr = string(detailsBytes)
			}

			writer.Write([]string{
				l.ID.String(),
				l.WalletID.String(),
				agentID,
				policyID,
				permissionID,
				l.EventType,
				detailsStr,
				ipAddress,
				userAgent,
				l.CreatedAt.Format(time.RFC3339),
			})
		}
		writer.Flush()
		return
	}

	// Default to JSON
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=audit_logs.json")
	json.NewEncoder(w).Encode(logs)
}
