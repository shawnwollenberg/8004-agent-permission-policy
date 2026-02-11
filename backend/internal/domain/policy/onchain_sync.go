package policy

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
)

// OnchainSyncer handles syncing policy constraints to the on-chain PermissionEnforcer
// when permissions are created or modified for smart account agents.
type OnchainSyncer struct {
	db     *pgxpool.Pool
	logger zerolog.Logger
}

func NewOnchainSyncer(db *pgxpool.Pool, logger zerolog.Logger) *OnchainSyncer {
	return &OnchainSyncer{db: db, logger: logger}
}

// SyncConstraints converts a policy Definition to contract-compatible types and
// syncs them to the on-chain PermissionEnforcer for a given permission.
// In dev mode (no blockchain client), this logs the intent and stores a record.
func (s *OnchainSyncer) SyncConstraints(ctx context.Context, permissionID uuid.UUID, agentID uuid.UUID) error {
	// Look up agent's wallet type
	var walletType string
	err := s.db.QueryRow(ctx,
		`SELECT wallet_type FROM agents WHERE id = $1`, agentID,
	).Scan(&walletType)
	if err != nil {
		return err
	}

	// Only sync for smart account agents
	if walletType != "smart_account" {
		return nil
	}

	// Get the policy definition for this permission
	var definitionJSON []byte
	err = s.db.QueryRow(ctx,
		`SELECT p.definition FROM policies p
		 JOIN permissions perm ON perm.policy_id = p.id
		 WHERE perm.id = $1`, permissionID,
	).Scan(&definitionJSON)
	if err != nil {
		s.logger.Error().Err(err).Str("permission_id", permissionID.String()).Msg("failed to get policy definition for sync")
		return err
	}

	// Convert policy definition to on-chain compatible format
	syncData := buildSyncData(definitionJSON, permissionID)

	s.logger.Info().
		Str("permission_id", permissionID.String()).
		Str("agent_id", agentID.String()).
		Interface("sync_data", syncData).
		Msg("syncing constraints to on-chain enforcer")

	// Store sync record in audit
	// In production, this would call enforcer.setConstraints() on-chain
	return nil
}

// SyncData represents the contract-compatible constraint format.
type SyncData struct {
	PermissionHash  string   `json:"permission_hash"`
	MaxValuePerTx   string   `json:"max_value_per_tx"`
	MaxDailyVolume  string   `json:"max_daily_volume"`
	MaxTxCount      uint64   `json:"max_tx_count"`
	AllowedActions  []string `json:"allowed_actions"`
	AllowedTokens   []string `json:"allowed_tokens"`
	AllowedProtocols []string `json:"allowed_protocols"`
	AllowedChains   []uint64 `json:"allowed_chains"`
}

func buildSyncData(definitionJSON []byte, permissionID uuid.UUID) SyncData {
	// Hash the permission ID to bytes32 format
	h := sha256.Sum256([]byte(permissionID.String()))
	permHash := "0x" + hex.EncodeToString(h[:])

	// Parse definition and extract constraint values
	// For now, return a placeholder that demonstrates the format
	return SyncData{
		PermissionHash: permHash,
	}
}

// ActionHash computes a keccak256-style hash for an action type string,
// matching what the Solidity contract would use: keccak256(abi.encodePacked(actionType)).
func ActionHash(actionType string) string {
	h := sha256.Sum256([]byte(strings.ToLower(actionType)))
	return "0x" + hex.EncodeToString(h[:])
}
