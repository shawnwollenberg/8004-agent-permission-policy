package blockchain

import (
	"context"
	"crypto/ecdsa"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/blockchain/bindings"
	"github.com/erc8004/policy-saas/internal/config"
)

// Client wraps blockchain interactions for smart account operations.
// When no DEPLOYER_PRIVATE_KEY is configured, it runs in simulated mode
// (deterministic SHA256-based addresses, no real transactions).
type Client struct {
	ethClient        *ethclient.Client
	chainID          *big.Int
	signer           *bind.TransactOpts
	signerKey        *ecdsa.PrivateKey
	identityRegistry *bindings.IdentityRegistry
	policyRegistry   *bindings.PolicyRegistry
	enforcer         *bindings.PermissionEnforcer
	priceOracle      *bindings.PriceOracle
	feeManager       *bindings.GuardrailFeeManager
	factory          *bindings.AgentAccountFactory
	simulated        bool

	// Config addresses (always available)
	rpcURL          string
	factoryAddress  string
	enforcerAddress string
	entryPoint      string
	logger          zerolog.Logger
}

// NewClient creates a blockchain client from config.
// If DEPLOYER_PRIVATE_KEY is empty, the client operates in simulated mode.
func NewClient(cfg *config.Config, logger zerolog.Logger) *Client {
	c := &Client{
		rpcURL:          cfg.Blockchain.RPCURL,
		chainID:         big.NewInt(cfg.Blockchain.ChainID),
		factoryAddress:  cfg.Blockchain.SmartAccountFactoryAddress,
		enforcerAddress: cfg.Blockchain.PermissionEnforcerAddress,
		entryPoint:      cfg.Blockchain.EntryPointAddress,
		logger:          logger,
		simulated:       true,
	}

	deployerKey := strings.TrimSpace(cfg.Blockchain.DeployerPrivateKey)
	if deployerKey == "" {
		logger.Info().Msg("blockchain client: no DEPLOYER_PRIVATE_KEY configured, using simulated mode")
		return c
	}

	// Strip 0x prefix if present
	deployerKey = strings.TrimPrefix(deployerKey, "0x")

	// Parse private key
	privateKey, err := crypto.HexToECDSA(deployerKey)
	if err != nil {
		logger.Error().Err(err).Msg("blockchain client: invalid DEPLOYER_PRIVATE_KEY, falling back to simulated mode")
		return c
	}
	c.signerKey = privateKey

	// Connect to RPC
	ethClient, err := ethclient.Dial(cfg.Blockchain.RPCURL)
	if err != nil {
		logger.Error().Err(err).Str("rpc_url", cfg.Blockchain.RPCURL).Msg("blockchain client: failed to connect to RPC, falling back to simulated mode")
		return c
	}
	c.ethClient = ethClient

	// Create transaction signer
	chainID := big.NewInt(cfg.Blockchain.ChainID)
	txOpts, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		logger.Error().Err(err).Msg("blockchain client: failed to create transactor, falling back to simulated mode")
		return c
	}
	c.signer = txOpts

	// Instantiate contract bindings
	if cfg.Blockchain.IdentityRegistryAddress != "" {
		ir, err := bindings.NewIdentityRegistry(common.HexToAddress(cfg.Blockchain.IdentityRegistryAddress), ethClient)
		if err != nil {
			logger.Error().Err(err).Msg("blockchain client: failed to bind IdentityRegistry")
		} else {
			c.identityRegistry = ir
		}
	}

	if cfg.Blockchain.PolicyRegistryAddress != "" {
		pr, err := bindings.NewPolicyRegistry(common.HexToAddress(cfg.Blockchain.PolicyRegistryAddress), ethClient)
		if err != nil {
			logger.Error().Err(err).Msg("blockchain client: failed to bind PolicyRegistry")
		} else {
			c.policyRegistry = pr
		}
	}

	if cfg.Blockchain.PermissionEnforcerAddress != "" {
		pe, err := bindings.NewPermissionEnforcer(common.HexToAddress(cfg.Blockchain.PermissionEnforcerAddress), ethClient)
		if err != nil {
			logger.Error().Err(err).Msg("blockchain client: failed to bind PermissionEnforcer")
		} else {
			c.enforcer = pe
		}
	}

	if cfg.Blockchain.PriceOracleAddress != "" {
		po, err := bindings.NewPriceOracle(common.HexToAddress(cfg.Blockchain.PriceOracleAddress), ethClient)
		if err != nil {
			logger.Error().Err(err).Msg("blockchain client: failed to bind PriceOracle")
		} else {
			c.priceOracle = po
		}
	}

	if cfg.Blockchain.FeeManagerAddress != "" {
		fm, err := bindings.NewGuardrailFeeManager(common.HexToAddress(cfg.Blockchain.FeeManagerAddress), ethClient)
		if err != nil {
			logger.Error().Err(err).Msg("blockchain client: failed to bind GuardrailFeeManager")
		} else {
			c.feeManager = fm
		}
	}

	if cfg.Blockchain.SmartAccountFactoryAddress != "" {
		f, err := bindings.NewAgentAccountFactory(common.HexToAddress(cfg.Blockchain.SmartAccountFactoryAddress), ethClient)
		if err != nil {
			logger.Error().Err(err).Msg("blockchain client: failed to bind AgentAccountFactory")
		} else {
			c.factory = f
		}
	}

	c.simulated = false
	deployerAddr := crypto.PubkeyToAddress(privateKey.PublicKey)
	logger.Info().
		Str("deployer", deployerAddr.Hex()).
		Int64("chain_id", cfg.Blockchain.ChainID).
		Str("rpc_url", cfg.Blockchain.RPCURL).
		Msg("blockchain client: connected in live mode")

	return c
}

// NewClientFromBlockchainConfig creates a blockchain client from a BlockchainConfig directly.
// Used by MultiClient to construct per-chain clients.
func NewClientFromBlockchainConfig(bcfg config.BlockchainConfig, logger zerolog.Logger) *Client {
	cfg := &config.Config{Blockchain: bcfg}
	return NewClient(cfg, logger)
}

// IsSimulated returns true when the client has no real blockchain connection.
func (c *Client) IsSimulated() bool {
	return c.simulated
}

// FactoryAddress returns the configured factory address.
func (c *Client) FactoryAddress() string {
	return c.factoryAddress
}

// EntryPointAddress returns the configured entrypoint address.
func (c *Client) EntryPointAddress() string {
	return c.entryPoint
}

// ChainID returns the configured chain ID as int64.
func (c *Client) ChainID() int64 {
	return c.chainID.Int64()
}

// --- On-chain operations ---
// All methods check c.simulated and return graceful fallbacks when true.

// ComputeSmartAccountAddress computes a deterministic address for a smart account.
// In live mode, calls factory.getAddress() on-chain.
// In simulated mode, computes a SHA256-based deterministic address.
func (c *Client) ComputeSmartAccountAddress(signerAddress string, agentIDHex string, salt string) (string, error) {
	if c.simulated || c.factory == nil {
		input := fmt.Sprintf("%s:%s:%s:%s", c.factoryAddress, signerAddress, agentIDHex, salt)
		hash := sha256.Sum256([]byte(input))
		return "0x" + hex.EncodeToString(hash[:20]), nil
	}

	owner := common.HexToAddress(signerAddress)
	agentID := Keccak256String(agentIDHex)
	saltBytes := Keccak256String(salt)

	var result []interface{}
	err := c.factory.Call(&bind.CallOpts{}, &result, "getAddress", owner, agentID, saltBytes)
	if err != nil {
		return "", fmt.Errorf("factory.getAddress failed: %w", err)
	}

	if len(result) == 0 {
		return "", fmt.Errorf("factory.getAddress returned no result")
	}

	addr, ok := result[0].(common.Address)
	if !ok {
		return "", fmt.Errorf("factory.getAddress returned unexpected type")
	}

	return addr.Hex(), nil
}

// RegisterAgent registers an agent in the IdentityRegistry on-chain.
// Returns the transaction hash.
func (c *Client) RegisterAgent(ctx context.Context, agentID [32]byte, metadata string) (string, error) {
	if c.simulated || c.identityRegistry == nil {
		// Return a realistic-looking tx hash for demo/simulated mode
		hash := sha256.Sum256(append([]byte("register:"), agentID[:]...))
		return "0x" + hex.EncodeToString(hash[:]), nil
	}

	tx, err := c.transact(ctx, c.identityRegistry.BoundContract, "registerAgent", agentID, metadata)
	if err != nil {
		return "", fmt.Errorf("registerAgent tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", err
	}

	return receipt.TxHash.Hex(), nil
}

// GetCreationFee returns the current smart account creation fee in wei.
// In simulated mode, returns 0.
func (c *Client) GetCreationFee(ctx context.Context) (*big.Int, error) {
	if c.simulated || c.feeManager == nil {
		return big.NewInt(0), nil
	}

	var result []interface{}
	err := c.feeManager.Call(&bind.CallOpts{Context: ctx}, &result, "getCreationFeeWei")
	if err != nil {
		return nil, fmt.Errorf("feeManager.getCreationFeeWei failed: %w", err)
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("feeManager.getCreationFeeWei returned no result")
	}

	fee, ok := result[0].(*big.Int)
	if !ok {
		return nil, fmt.Errorf("feeManager.getCreationFeeWei returned unexpected type")
	}

	return fee, nil
}

// CreateSmartAccount deploys a new ERC-4337 smart account via the factory.
// Returns the deployed account address and transaction hash.
func (c *Client) CreateSmartAccount(ctx context.Context, owner common.Address, agentID [32]byte, salt [32]byte) (string, string, error) {
	if c.simulated || c.factory == nil {
		input := fmt.Sprintf("%s:%s:%s", owner.Hex(), hex.EncodeToString(agentID[:]), hex.EncodeToString(salt[:]))
		addrHash := sha256.Sum256([]byte(input))
		addr := "0x" + hex.EncodeToString(addrHash[:20])
		txHash := sha256.Sum256(append([]byte("deploy:"), addrHash[:]...))
		return addr, "0x" + hex.EncodeToString(txHash[:]), nil
	}

	// Get creation fee
	creationFee, err := c.GetCreationFee(ctx)
	if err != nil {
		c.logger.Warn().Err(err).Msg("failed to get creation fee, proceeding with zero value")
		creationFee = big.NewInt(0)
	}

	tx, err := c.transactWithValue(ctx, c.factory.BoundContract, "createAccount", creationFee, owner, agentID, salt)
	if err != nil {
		return "", "", fmt.Errorf("createAccount tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", "", err
	}

	// Read the account address from the return value by calling getAddress
	var result []interface{}
	err = c.factory.Call(&bind.CallOpts{Context: ctx}, &result, "getAddress", owner, agentID, salt)
	if err != nil {
		return "", receipt.TxHash.Hex(), fmt.Errorf("factory.getAddress post-deploy failed: %w", err)
	}

	if len(result) == 0 {
		return "", receipt.TxHash.Hex(), fmt.Errorf("factory.getAddress returned no result")
	}

	addr, ok := result[0].(common.Address)
	if !ok {
		return "", receipt.TxHash.Hex(), fmt.Errorf("factory.getAddress returned unexpected type")
	}

	return addr.Hex(), receipt.TxHash.Hex(), nil
}

// CreatePolicy registers a policy on-chain in the PolicyRegistry.
// Returns the on-chain policy ID (bytes32) as hex string and the tx hash.
func (c *Client) CreatePolicy(ctx context.Context, contentHash [32]byte) (string, string, error) {
	if c.simulated || c.policyRegistry == nil {
		policyID := crypto.Keccak256(append([]byte("policy:"), contentHash[:]...))
		txHash := sha256.Sum256(append([]byte("createPolicy:"), policyID...))
		return "0x" + hex.EncodeToString(policyID), "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.policyRegistry.BoundContract, "createPolicy", contentHash)
	if err != nil {
		return "", "", fmt.Errorf("createPolicy tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", "", err
	}

	// Extract policyId from logs (PolicyCreated event, first indexed topic after event sig)
	if len(receipt.Logs) > 0 && len(receipt.Logs[0].Topics) > 1 {
		policyID := receipt.Logs[0].Topics[1]
		return "0x" + hex.EncodeToString(policyID[:]), receipt.TxHash.Hex(), nil
	}

	// Fallback: compute deterministically
	policyID := crypto.Keccak256(append([]byte("policy:"), contentHash[:]...))
	return "0x" + hex.EncodeToString(policyID), receipt.TxHash.Hex(), nil
}

// DeactivatePolicy deactivates a policy on-chain in the PolicyRegistry.
// Returns the tx hash.
func (c *Client) DeactivatePolicy(ctx context.Context, policyID [32]byte) (string, error) {
	if c.simulated || c.policyRegistry == nil {
		txHash := sha256.Sum256(append([]byte("deactivatePolicy:"), policyID[:]...))
		return "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.policyRegistry.BoundContract, "deactivatePolicy", policyID)
	if err != nil {
		return "", fmt.Errorf("deactivatePolicy tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", err
	}

	return receipt.TxHash.Hex(), nil
}

// ReactivatePolicy reactivates a previously deactivated policy on-chain.
// Returns the tx hash.
func (c *Client) ReactivatePolicy(ctx context.Context, policyID [32]byte) (string, error) {
	if c.simulated || c.policyRegistry == nil {
		txHash := sha256.Sum256(append([]byte("reactivatePolicy:"), policyID[:]...))
		return "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.policyRegistry.BoundContract, "reactivatePolicy", policyID)
	if err != nil {
		return "", fmt.Errorf("reactivatePolicy tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", err
	}

	return receipt.TxHash.Hex(), nil
}

// GrantPermission registers a permission on-chain in the PolicyRegistry.
// Returns the on-chain permission ID (bytes32) as hex string and the tx hash.
func (c *Client) GrantPermission(ctx context.Context, policyHash [32]byte, agentID [32]byte, validFrom, validUntil *big.Int) (string, string, error) {
	if c.simulated || c.policyRegistry == nil {
		permID := crypto.Keccak256(append(policyHash[:], agentID[:]...))
		txHash := sha256.Sum256(append([]byte("mint:"), permID...))
		return "0x" + hex.EncodeToString(permID), "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.policyRegistry.BoundContract, "grantPermission", policyHash, agentID, validFrom, validUntil)
	if err != nil {
		return "", "", fmt.Errorf("grantPermission tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", "", err
	}

	// Extract permissionId from logs (first topic of PermissionGranted event)
	if len(receipt.Logs) > 0 && len(receipt.Logs[0].Topics) > 1 {
		permID := receipt.Logs[0].Topics[1]
		return "0x" + hex.EncodeToString(permID[:]), receipt.TxHash.Hex(), nil
	}

	// Fallback: compute deterministically
	permID := crypto.Keccak256(append(policyHash[:], agentID[:]...))
	return "0x" + hex.EncodeToString(permID), receipt.TxHash.Hex(), nil
}

// RevokePermission revokes a permission on-chain in the PolicyRegistry.
// Returns the tx hash.
func (c *Client) RevokePermission(ctx context.Context, permissionID [32]byte) (string, error) {
	if c.simulated || c.policyRegistry == nil {
		txHash := sha256.Sum256(append([]byte("revokePermission:"), permissionID[:]...))
		return "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.policyRegistry.BoundContract, "revokePermission", permissionID)
	if err != nil {
		return "", fmt.Errorf("revokePermission tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", err
	}

	return receipt.TxHash.Hex(), nil
}

// SetConstraints pushes policy constraints to the PermissionEnforcer contract.
func (c *Client) SetConstraints(
	ctx context.Context,
	permissionID [32]byte,
	maxValuePerTx *big.Int,
	maxDailyVolume *big.Int,
	maxTxCount *big.Int,
	allowedActions [][32]byte,
	allowedTokens []common.Address,
	allowedProtocols []common.Address,
	allowedChains []*big.Int,
) (string, error) {
	if c.simulated || c.enforcer == nil {
		c.logger.Info().
			Str("permission_id", hex.EncodeToString(permissionID[:])).
			Msg("simulated: would call setConstraints")
		txHash := sha256.Sum256(append([]byte("sync:"), permissionID[:]...))
		return "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.enforcer.BoundContract, "setConstraints",
		permissionID, maxValuePerTx, maxDailyVolume, maxTxCount,
		allowedActions, allowedTokens, allowedProtocols, allowedChains,
	)
	if err != nil {
		return "", fmt.Errorf("setConstraints tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", err
	}

	return receipt.TxHash.Hex(), nil
}

// SetPriceOracle calls setPriceOracle on the PermissionEnforcer.
func (c *Client) SetPriceOracle(ctx context.Context, oracleAddress common.Address) (string, error) {
	if c.simulated || c.enforcer == nil {
		txHash := sha256.Sum256(append([]byte("setPriceOracle:"), oracleAddress.Bytes()...))
		return "0x" + hex.EncodeToString(txHash[:]), nil
	}

	tx, err := c.transact(ctx, c.enforcer.BoundContract, "setPriceOracle", oracleAddress)
	if err != nil {
		return "", fmt.Errorf("setPriceOracle tx failed: %w", err)
	}

	receipt, err := c.WaitForTx(ctx, tx)
	if err != nil {
		return "", err
	}

	return receipt.TxHash.Hex(), nil
}

// GetEthValue calls getEthValue on the PriceOracle (read-only).
func (c *Client) GetEthValue(ctx context.Context, token common.Address, amount *big.Int) (*big.Int, error) {
	if c.simulated || c.priceOracle == nil {
		return amount, nil
	}

	var result []interface{}
	err := c.priceOracle.Call(&bind.CallOpts{Context: ctx}, &result, "getEthValue", token, amount)
	if err != nil {
		return nil, fmt.Errorf("priceOracle.getEthValue failed: %w", err)
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("priceOracle.getEthValue returned no result")
	}

	ethValue, ok := result[0].(*big.Int)
	if !ok {
		return nil, fmt.Errorf("priceOracle.getEthValue returned unexpected type")
	}

	return ethValue, nil
}

// GetOwnerAgents returns all agent IDs registered on-chain for the given owner address.
func (c *Client) GetOwnerAgents(ctx context.Context, ownerAddress string) ([][32]byte, error) {
	if c.simulated || c.identityRegistry == nil {
		return nil, nil
	}

	var result []interface{}
	err := c.identityRegistry.Call(&bind.CallOpts{Context: ctx}, &result, "getOwnerAgents", common.HexToAddress(ownerAddress))
	if err != nil {
		return nil, fmt.Errorf("identityRegistry.getOwnerAgents failed: %w", err)
	}

	if len(result) == 0 {
		return nil, nil
	}

	ids, ok := result[0].([][32]byte)
	if !ok {
		return nil, fmt.Errorf("identityRegistry.getOwnerAgents returned unexpected type")
	}

	return ids, nil
}

// GetAgentOnchain reads an agent's details from the IdentityRegistry contract.
func (c *Client) GetAgentOnchain(ctx context.Context, agentID [32]byte) (owner common.Address, metadata string, active bool, registeredAt *big.Int, err error) {
	if c.simulated || c.identityRegistry == nil {
		return common.Address{}, "", false, big.NewInt(0), nil
	}

	var result []interface{}
	err = c.identityRegistry.Call(&bind.CallOpts{Context: ctx}, &result, "getAgent", agentID)
	if err != nil {
		return common.Address{}, "", false, nil, fmt.Errorf("identityRegistry.getAgent failed: %w", err)
	}

	if len(result) < 5 {
		return common.Address{}, "", false, nil, fmt.Errorf("identityRegistry.getAgent returned insufficient fields")
	}

	owner, _ = result[0].(common.Address)
	// result[1] is agentId (bytes32), skip
	metadata, _ = result[2].(string)
	registeredAt, _ = result[3].(*big.Int)
	active, _ = result[4].(bool)

	return owner, metadata, active, registeredAt, nil
}

// WaitForTx waits for a transaction to be mined and returns the receipt.
func (c *Client) WaitForTx(ctx context.Context, tx *types.Transaction) (*types.Receipt, error) {
	receipt, err := bind.WaitMined(ctx, c.ethClient, tx)
	if err != nil {
		return nil, fmt.Errorf("waiting for tx %s: %w", tx.Hash().Hex(), err)
	}
	if receipt.Status == 0 {
		return receipt, fmt.Errorf("tx %s reverted", tx.Hash().Hex())
	}
	c.logger.Info().
		Str("tx_hash", tx.Hash().Hex()).
		Uint64("block", receipt.BlockNumber.Uint64()).
		Uint64("gas_used", receipt.GasUsed).
		Msg("transaction mined")
	return receipt, nil
}

// transact creates and sends a transaction to a bound contract method.
func (c *Client) transact(ctx context.Context, contract *bind.BoundContract, method string, args ...interface{}) (*types.Transaction, error) {
	// Create fresh TransactOpts for each transaction (avoids nonce reuse)
	opts := *c.signer
	opts.Context = ctx

	tx, err := contract.Transact(&opts, method, args...)
	if err != nil {
		return nil, err
	}

	c.logger.Info().
		Str("method", method).
		Str("tx_hash", tx.Hash().Hex()).
		Msg("transaction sent")

	return tx, nil
}

// transactWithValue creates and sends a transaction with ETH value attached.
func (c *Client) transactWithValue(ctx context.Context, contract *bind.BoundContract, method string, value *big.Int, args ...interface{}) (*types.Transaction, error) {
	opts := *c.signer
	opts.Context = ctx
	opts.Value = value

	tx, err := contract.Transact(&opts, method, args...)
	if err != nil {
		return nil, err
	}

	c.logger.Info().
		Str("method", method).
		Str("tx_hash", tx.Hash().Hex()).
		Str("value", value.String()).
		Msg("transaction sent with value")

	return tx, nil
}
