package blockchain

import (
	"context"
	"encoding/hex"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/domain/audit"
)

// Event topic signatures
var (
	topicEnforcementResult   = crypto.Keccak256Hash([]byte("EnforcementResult(bytes32,bytes32,bool)"))
	topicConstraintViolation = crypto.Keccak256Hash([]byte("ConstraintViolation(bytes32,bytes32,string)"))
	topicUsageRecorded       = crypto.Keccak256Hash([]byte("UsageRecorded(bytes32,bytes32,uint256)"))
	topicExecuted            = crypto.Keccak256Hash([]byte("Executed(address,uint256,uint256,bytes)"))
	topicAccountCreated      = crypto.Keccak256Hash([]byte("AccountCreated(address,address,bytes32)"))
)

const indexerStateKey = "main"

// Indexer polls the chain for contract events and writes them to the audit log.
type Indexer struct {
	client       *Client
	db           *pgxpool.Pool
	auditLogger  *audit.Logger
	logger       zerolog.Logger
	pollInterval time.Duration
}

// NewIndexer creates a new Indexer.
func NewIndexer(client *Client, db *pgxpool.Pool, auditLogger *audit.Logger, logger zerolog.Logger) *Indexer {
	return &Indexer{
		client:       client,
		db:           db,
		auditLogger:  auditLogger,
		logger:       logger,
		pollInterval: 12 * time.Second,
	}
}

// Start launches the indexer loop in the background.
// No-ops in simulated mode.
func (idx *Indexer) Start(ctx context.Context) {
	if idx.client.IsSimulated() {
		idx.logger.Info().Msg("indexer: simulated mode, skipping on-chain event indexing")
		return
	}
	idx.logger.Info().Msg("indexer: starting on-chain event indexer")
	go idx.run(ctx)
}

func (idx *Indexer) run(ctx context.Context) {
	ticker := time.NewTicker(idx.pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := idx.poll(ctx); err != nil {
				idx.logger.Error().Err(err).Msg("indexer: poll error")
			}
		}
	}
}

func (idx *Indexer) getLastBlock(ctx context.Context) int64 {
	var lastBlock int64
	idx.db.QueryRow(ctx,
		`SELECT last_block FROM indexer_state WHERE id = $1`, indexerStateKey,
	).Scan(&lastBlock)
	return lastBlock
}

func (idx *Indexer) setLastBlock(ctx context.Context, block int64) {
	idx.db.Exec(ctx,
		`INSERT INTO indexer_state (id, last_block, updated_at) VALUES ($1, $2, NOW())
		 ON CONFLICT (id) DO UPDATE SET last_block = $2, updated_at = NOW()`,
		indexerStateKey, block,
	)
}

func (idx *Indexer) poll(ctx context.Context) error {
	if idx.client.ethClient == nil {
		return nil
	}

	currentBlock, err := idx.client.ethClient.BlockNumber(ctx)
	if err != nil {
		return err
	}

	lastBlock := idx.getLastBlock(ctx)
	if lastBlock == 0 {
		// Start from current block - 1000 to pick up recent history
		start := int64(currentBlock) - 1000
		if start < 0 {
			start = 0
		}
		lastBlock = start
	}

	fromBlock := lastBlock + 1
	toBlock := int64(currentBlock)

	if fromBlock > toBlock {
		return nil
	}

	// Cap range to avoid too-large requests
	if toBlock-fromBlock > 2000 {
		toBlock = fromBlock + 2000
	}

	// Build filter for all watched contract addresses
	addresses := idx.watchedAddresses()
	if len(addresses) == 0 {
		return nil
	}

	query := ethereum.FilterQuery{
		FromBlock: big.NewInt(fromBlock),
		ToBlock:   big.NewInt(toBlock),
		Addresses: addresses,
		Topics: [][]common.Hash{{
			topicEnforcementResult,
			topicConstraintViolation,
			topicUsageRecorded,
			topicExecuted,
			topicAccountCreated,
		}},
	}

	logs, err := idx.client.ethClient.FilterLogs(ctx, query)
	if err != nil {
		return err
	}

	for _, log := range logs {
		idx.processLog(ctx, log)
	}

	idx.setLastBlock(ctx, toBlock)
	if len(logs) > 0 {
		idx.logger.Info().Int64("from", fromBlock).Int64("to", toBlock).Int("events", len(logs)).Msg("indexer: processed block range")
	}
	return nil
}

func (idx *Indexer) watchedAddresses() []common.Address {
	var addrs []common.Address
	if idx.client.enforcerAddress != "" {
		addrs = append(addrs, common.HexToAddress(idx.client.enforcerAddress))
	}
	if idx.client.factoryAddress != "" {
		addrs = append(addrs, common.HexToAddress(idx.client.factoryAddress))
	}
	// Also watch all deployed smart account addresses
	ctx := context.Background()
	rows, err := idx.db.Query(ctx, `SELECT account_address FROM smart_accounts WHERE deployed = true`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var addr string
			if rows.Scan(&addr) == nil && addr != "" {
				addrs = append(addrs, common.HexToAddress(addr))
			}
		}
	}
	return addrs
}

func (idx *Indexer) processLog(ctx context.Context, log types.Log) {
	if len(log.Topics) == 0 {
		return
	}

	topic := log.Topics[0]
	txHash := log.TxHash.Hex()
	blockNumber := int64(log.BlockNumber)

	switch topic {
	case topicEnforcementResult:
		idx.handleEnforcementResult(ctx, log, txHash, blockNumber)
	case topicConstraintViolation:
		idx.handleConstraintViolation(ctx, log, txHash, blockNumber)
	case topicUsageRecorded:
		idx.handleUsageRecorded(ctx, log, txHash, blockNumber)
	case topicExecuted:
		idx.handleExecuted(ctx, log, txHash, blockNumber)
	case topicAccountCreated:
		idx.handleAccountCreated(ctx, log, txHash, blockNumber)
	}
}

// resolveAgent looks up wallet_id and agent UUID from the contract's bytes32 agentId.
func (idx *Indexer) resolveAgent(ctx context.Context, agentIDBytes32 [32]byte) (walletID uuid.UUID, agentID *uuid.UUID) {
	agentHex := "0x" + hex.EncodeToString(agentIDBytes32[:])
	var wid uuid.UUID
	var aid uuid.UUID
	err := idx.db.QueryRow(ctx,
		`SELECT wallet_id, id FROM agents WHERE onchain_registry_id = $1 OR agent_address = $2`,
		agentHex, agentHex,
	).Scan(&wid, &aid)
	if err != nil {
		// Try matching by account_address in smart_accounts
		err = idx.db.QueryRow(ctx,
			`SELECT a.wallet_id, a.id FROM agents a JOIN smart_accounts sa ON sa.agent_id = a.id WHERE sa.account_address = $1`,
			agentHex,
		).Scan(&wid, &aid)
		if err != nil {
			return uuid.Nil, nil
		}
	}
	return wid, &aid
}

func (idx *Indexer) handleEnforcementResult(ctx context.Context, log types.Log, txHash string, blockNumber int64) {
	if len(log.Topics) < 2 {
		return
	}
	var agentIDBytes [32]byte
	copy(agentIDBytes[:], log.Topics[1].Bytes())
	allowed := false
	if len(log.Data) >= 64 {
		allowed = log.Data[63] == 1
	}
	walletID, agentID := idx.resolveAgent(ctx, agentIDBytes)
	if walletID == uuid.Nil {
		return
	}
	eventType := "onchain.enforcement.allowed"
	if !allowed {
		eventType = "onchain.enforcement.blocked"
	}
	idx.auditLogger.Log(ctx, audit.Event{
		WalletID:    walletID,
		AgentID:     agentID,
		EventType:   eventType,
		Source:      "onchain",
		TxHash:      txHash,
		BlockNumber: blockNumber,
		Details: map[string]interface{}{
			"allowed":  allowed,
			"tx_hash":  txHash,
			"block":    blockNumber,
			"contract": log.Address.Hex(),
		},
	})
}

func (idx *Indexer) handleConstraintViolation(ctx context.Context, log types.Log, txHash string, blockNumber int64) {
	if len(log.Topics) < 2 {
		return
	}
	var agentIDBytes [32]byte
	copy(agentIDBytes[:], log.Topics[1].Bytes())
	walletID, agentID := idx.resolveAgent(ctx, agentIDBytes)
	if walletID == uuid.Nil {
		return
	}
	idx.auditLogger.Log(ctx, audit.Event{
		WalletID:    walletID,
		AgentID:     agentID,
		EventType:   "onchain.constraint_violation",
		Source:      "onchain",
		TxHash:      txHash,
		BlockNumber: blockNumber,
		Details: map[string]interface{}{
			"tx_hash":  txHash,
			"block":    blockNumber,
			"contract": log.Address.Hex(),
		},
	})
}

func (idx *Indexer) handleUsageRecorded(ctx context.Context, log types.Log, txHash string, blockNumber int64) {
	if len(log.Topics) < 2 {
		return
	}
	var agentIDBytes [32]byte
	copy(agentIDBytes[:], log.Topics[1].Bytes())
	walletID, agentID := idx.resolveAgent(ctx, agentIDBytes)
	if walletID == uuid.Nil {
		return
	}
	idx.auditLogger.Log(ctx, audit.Event{
		WalletID:    walletID,
		AgentID:     agentID,
		EventType:   "onchain.usage_recorded",
		Source:      "onchain",
		TxHash:      txHash,
		BlockNumber: blockNumber,
		Details: map[string]interface{}{
			"tx_hash":  txHash,
			"block":    blockNumber,
			"contract": log.Address.Hex(),
		},
	})
}

func (idx *Indexer) handleExecuted(ctx context.Context, log types.Log, txHash string, blockNumber int64) {
	// Executed(address target, uint256 value, uint256 fee, bytes data)
	// Resolve by contract address (the smart account itself)
	accountAddr := log.Address.Hex()
	var walletID uuid.UUID
	var agentID uuid.UUID
	err := idx.db.QueryRow(ctx,
		`SELECT a.wallet_id, a.id FROM agents a JOIN smart_accounts sa ON sa.agent_id = a.id WHERE LOWER(sa.account_address) = LOWER($1)`,
		accountAddr,
	).Scan(&walletID, &agentID)
	if err != nil {
		return
	}
	aid := agentID
	idx.auditLogger.Log(ctx, audit.Event{
		WalletID:    walletID,
		AgentID:     &aid,
		EventType:   "onchain.executed",
		Source:      "onchain",
		TxHash:      txHash,
		BlockNumber: blockNumber,
		Details: map[string]interface{}{
			"tx_hash":       txHash,
			"block":         blockNumber,
			"smart_account": accountAddr,
		},
	})
}

func (idx *Indexer) handleAccountCreated(ctx context.Context, log types.Log, txHash string, blockNumber int64) {
	// AccountCreated(address account, address owner, bytes32 agentId)
	if len(log.Topics) < 4 {
		return
	}
	var agentIDBytes [32]byte
	copy(agentIDBytes[:], log.Topics[3].Bytes())
	walletID, agentID := idx.resolveAgent(ctx, agentIDBytes)
	if walletID == uuid.Nil {
		return
	}
	accountAddr := common.HexToAddress(log.Topics[1].Hex()).Hex()
	idx.auditLogger.Log(ctx, audit.Event{
		WalletID:    walletID,
		AgentID:     agentID,
		EventType:   "onchain.account_created",
		Source:      "onchain",
		TxHash:      txHash,
		BlockNumber: blockNumber,
		Details: map[string]interface{}{
			"account_address": accountAddr,
			"tx_hash":         txHash,
			"block":           blockNumber,
		},
	})
}
