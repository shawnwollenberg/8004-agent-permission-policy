package audit

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
)

type Event struct {
	WalletID     uuid.UUID
	AgentID      *uuid.UUID
	PolicyID     *uuid.UUID
	PermissionID *uuid.UUID
	EventType    string
	Details      map[string]interface{}
	IPAddress    string
	UserAgent    string
}

type Logger struct {
	db     *pgxpool.Pool
	logger zerolog.Logger
}

func NewLogger(db *pgxpool.Pool, logger zerolog.Logger) *Logger {
	return &Logger{
		db:     db,
		logger: logger,
	}
}

func (l *Logger) Log(ctx context.Context, event Event) {
	detailsBytes, _ := json.Marshal(event.Details)

	_, err := l.db.Exec(ctx,
		`INSERT INTO audit_logs (wallet_id, agent_id, policy_id, permission_id, event_type, details, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		event.WalletID, event.AgentID, event.PolicyID, event.PermissionID, event.EventType, detailsBytes, nilIfEmpty(event.IPAddress), nilIfEmpty(event.UserAgent),
	)
	if err != nil {
		l.logger.Error().Err(err).Str("event_type", event.EventType).Msg("failed to log audit event")
	}

	// Trigger webhooks asynchronously
	go l.triggerWebhooks(context.Background(), event)
}

func (l *Logger) triggerWebhooks(ctx context.Context, event Event) {
	rows, err := l.db.Query(ctx,
		`SELECT id, url, secret, events FROM webhooks WHERE wallet_id = $1 AND active = true`,
		event.WalletID,
	)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var webhookID uuid.UUID
		var url, secret string
		var events []string

		if err := rows.Scan(&webhookID, &url, &secret, &events); err != nil {
			continue
		}

		// Check if this event type is subscribed
		subscribed := false
		for _, e := range events {
			if e == event.EventType || e == "*" {
				subscribed = true
				break
			}
		}
		if !subscribed {
			continue
		}

		// Send webhook
		go l.sendWebhook(ctx, webhookID, url, secret, event)
	}
}

func (l *Logger) sendWebhook(ctx context.Context, webhookID uuid.UUID, url, secret string, event Event) {
	payload := map[string]interface{}{
		"id":         uuid.New().String(),
		"type":       event.EventType,
		"wallet_id":  event.WalletID.String(),
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"details":    event.Details,
	}
	if event.AgentID != nil {
		payload["agent_id"] = event.AgentID.String()
	}
	if event.PolicyID != nil {
		payload["policy_id"] = event.PolicyID.String()
	}
	if event.PermissionID != nil {
		payload["permission_id"] = event.PermissionID.String()
	}

	body, _ := json.Marshal(payload)

	// Create signature
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	signature := hex.EncodeToString(mac.Sum(nil))

	// Send with retries
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*attempt) * time.Second)
		}

		req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Webhook-Signature", signature)
		req.Header.Set("X-Webhook-ID", webhookID.String())

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			// Update last_call_at
			l.db.Exec(ctx, `UPDATE webhooks SET last_call_at = NOW() WHERE id = $1`, webhookID)
			return
		}
		lastErr = nil
	}

	if lastErr != nil {
		l.logger.Warn().Err(lastErr).Str("webhook_id", webhookID.String()).Msg("webhook delivery failed")
	}
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
