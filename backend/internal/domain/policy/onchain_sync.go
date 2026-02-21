package policy

import (
	"context"
	"encoding/json"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/blockchain"
)

// OnchainSyncer handles syncing policy constraints to the on-chain PermissionEnforcer
// when permissions are created or modified for smart account agents.
type OnchainSyncer struct {
	db     *pgxpool.Pool
	mc     *blockchain.MultiClient
	logger zerolog.Logger
}

func NewOnchainSyncer(db *pgxpool.Pool, mc *blockchain.MultiClient, logger zerolog.Logger) *OnchainSyncer {
	return &OnchainSyncer{db: db, mc: mc, logger: logger}
}

// SyncConstraints converts a policy Definition to contract-compatible types and
// syncs them to the on-chain PermissionEnforcer for a given permission.
// Only runs for smart_account agents. Advisory (EOA) agents skip sync.
func (s *OnchainSyncer) SyncConstraints(ctx context.Context, permissionID uuid.UUID, agentID uuid.UUID) error {
	// Look up agent's wallet type and smart account chain_id
	var walletType string
	err := s.db.QueryRow(ctx,
		`SELECT wallet_type FROM agents WHERE id = $1`, agentID,
	).Scan(&walletType)
	if err != nil {
		return err
	}

	// Only sync for smart account agents
	if walletType != "smart_account" {
		s.logger.Debug().
			Str("agent_id", agentID.String()).
			Str("wallet_type", walletType).
			Msg("skipping constraint sync for non-smart-account agent")
		return nil
	}

	// Look up the smart account's chain_id to use the correct blockchain client
	var saChainID int64
	err = s.db.QueryRow(ctx,
		`SELECT chain_id FROM smart_accounts WHERE agent_id = $1`, agentID,
	).Scan(&saChainID)
	if err != nil {
		s.logger.Warn().Err(err).Str("agent_id", agentID.String()).Msg("failed to get smart account chain_id, using primary")
		saChainID = 0
	}

	var bc *blockchain.Client
	if saChainID != 0 {
		bc, err = s.mc.ForChain(saChainID)
		if err != nil {
			s.logger.Warn().Int64("chain_id", saChainID).Msg("unknown chain for smart account, using primary")
			bc = s.mc.Primary()
		}
	} else {
		bc = s.mc.Primary()
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

	// Parse the definition
	var def Definition
	if err := json.Unmarshal(definitionJSON, &def); err != nil {
		s.logger.Error().Err(err).Msg("failed to parse policy definition for sync")
		return err
	}

	// Build constraint parameters
	syncData := buildSyncData(&def)
	permIDBytes := blockchain.UUIDToBytes32(permissionID.String())

	s.logger.Info().
		Str("permission_id", permissionID.String()).
		Str("agent_id", agentID.String()).
		Int64("chain_id", bc.ChainID()).
		Interface("sync_data", syncData).
		Msg("syncing constraints to on-chain enforcer")

	// Push constraints on-chain
	txHash, err := bc.SetConstraints(
		ctx,
		permIDBytes,
		syncData.MaxValuePerTx,
		syncData.MaxDailyVolume,
		syncData.MaxTxCount,
		syncData.AllowedActions,
		syncData.AllowedTokens,
		syncData.AllowedProtocols,
		syncData.AllowedChains,
	)
	if err != nil {
		s.logger.Error().Err(err).Msg("setConstraints on-chain call failed")
		return err
	}

	s.logger.Info().
		Str("permission_id", permissionID.String()).
		Str("tx_hash", txHash).
		Msg("constraints synced to on-chain enforcer")

	return nil
}

// SyncData represents the contract-compatible constraint format.
type SyncData struct {
	MaxValuePerTx    *big.Int           `json:"max_value_per_tx"`
	MaxDailyVolume   *big.Int           `json:"max_daily_volume"`
	MaxTxCount       *big.Int           `json:"max_tx_count"`
	AllowedActions   [][32]byte         `json:"allowed_actions"`
	AllowedTokens    []common.Address   `json:"allowed_tokens"`
	AllowedProtocols []common.Address   `json:"allowed_protocols"`
	AllowedChains    []*big.Int         `json:"allowed_chains"`
}

func buildSyncData(def *Definition) SyncData {
	sd := SyncData{
		MaxValuePerTx:  blockchain.WeiFromString(def.Constraints.MaxValuePerTx),
		MaxDailyVolume: blockchain.WeiFromString(def.Constraints.MaxDailyVolume),
		MaxTxCount:     big.NewInt(int64(def.Constraints.MaxTxCount)),
	}

	// Convert action strings to keccak256 hashes
	for _, action := range def.Actions {
		if action == "*" {
			continue // Wildcard not sent to chain; absence of actions = allow all
		}
		sd.AllowedActions = append(sd.AllowedActions, blockchain.ActionHash(action))
	}

	// Convert token address strings to common.Address
	for _, token := range def.Assets.Tokens {
		token = strings.TrimSpace(token)
		if token != "" && strings.HasPrefix(token, "0x") {
			sd.AllowedTokens = append(sd.AllowedTokens, common.HexToAddress(token))
		}
	}

	// Convert protocol address strings to common.Address
	for _, protocol := range def.Assets.Protocols {
		protocol = strings.TrimSpace(protocol)
		if protocol != "" && strings.HasPrefix(protocol, "0x") {
			sd.AllowedProtocols = append(sd.AllowedProtocols, common.HexToAddress(protocol))
		}
	}

	// Convert chain IDs to *big.Int
	for _, chain := range def.Assets.Chains {
		sd.AllowedChains = append(sd.AllowedChains, big.NewInt(chain))
	}

	// Ensure non-nil slices
	if sd.AllowedActions == nil {
		sd.AllowedActions = [][32]byte{}
	}
	if sd.AllowedTokens == nil {
		sd.AllowedTokens = []common.Address{}
	}
	if sd.AllowedProtocols == nil {
		sd.AllowedProtocols = []common.Address{}
	}
	if sd.AllowedChains == nil {
		sd.AllowedChains = []*big.Int{}
	}

	return sd
}

// ActionHash computes a keccak256 hash for an action type string,
// matching what the Solidity contract would use: keccak256(abi.encodePacked(actionType)).
func ActionHash(actionType string) [32]byte {
	return blockchain.ActionHash(actionType)
}
