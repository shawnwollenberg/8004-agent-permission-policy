package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/blockchain"
	"github.com/erc8004/policy-saas/internal/config"
	"github.com/erc8004/policy-saas/internal/domain/audit"
	"github.com/erc8004/policy-saas/internal/domain/policy"
)

type Handlers struct {
	db               *pgxpool.Pool
	logger           zerolog.Logger
	cfg              *config.Config
	policyEngine     *policy.Engine
	auditLogger      *audit.Logger
	blockchainClient *blockchain.Client
	onchainSyncer    *policy.OnchainSyncer
}

func New(db *pgxpool.Pool, logger zerolog.Logger, cfg *config.Config) *Handlers {
	bc := blockchain.NewClient(cfg, logger)
	return &Handlers{
		db:               db,
		logger:           logger,
		cfg:              cfg,
		policyEngine:     policy.NewEngine(db, logger),
		auditLogger:      audit.NewLogger(db, logger),
		blockchainClient: bc,
		onchainSyncer:    policy.NewOnchainSyncer(db, bc, logger),
	}
}

func (h *Handlers) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
	})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func decodeJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}
