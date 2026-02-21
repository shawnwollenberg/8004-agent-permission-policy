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
	db            *pgxpool.Pool
	logger        zerolog.Logger
	cfg           *config.Config
	policyEngine  *policy.Engine
	auditLogger   *audit.Logger
	chainClients  *blockchain.MultiClient
	onchainSyncer *policy.OnchainSyncer
}

func New(db *pgxpool.Pool, logger zerolog.Logger, cfg *config.Config) *Handlers {
	mc := blockchain.NewMultiClient(cfg.Chains, cfg.Blockchain.ChainID, logger)
	return &Handlers{
		db:            db,
		logger:        logger,
		cfg:           cfg,
		policyEngine:  policy.NewEngine(db, logger),
		auditLogger:   audit.NewLogger(db, logger),
		chainClients:  mc,
		onchainSyncer: policy.NewOnchainSyncer(db, mc, logger),
	}
}

// clientForChain returns the blockchain client for the given chain ID.
// Falls back to the primary chain if chainID is 0.
func (h *Handlers) clientForChain(chainID int64) *blockchain.Client {
	if chainID == 0 {
		return h.chainClients.Primary()
	}
	c, err := h.chainClients.ForChain(chainID)
	if err != nil {
		h.logger.Warn().Int64("chain_id", chainID).Msg("unknown chain, falling back to primary")
		return h.chainClients.Primary()
	}
	return c
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
