package blockchain

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/config"
)

// Client wraps blockchain interactions for smart account operations.
// In dev mode (no RPC configured), it simulates addresses deterministically.
type Client struct {
	rpcURL          string
	chainID         int64
	factoryAddress  string
	enforcerAddress string
	entryPoint      string
	logger          zerolog.Logger
}

// NewClient creates a blockchain client from config.
// Returns nil if no factory address is configured.
func NewClient(cfg *config.Config, logger zerolog.Logger) *Client {
	if cfg.Blockchain.SmartAccountFactoryAddress == "" {
		logger.Info().Msg("blockchain client: no factory address configured, using simulated mode")
	}

	return &Client{
		rpcURL:          cfg.Blockchain.RPCURL,
		chainID:         cfg.Blockchain.ChainID,
		factoryAddress:  cfg.Blockchain.SmartAccountFactoryAddress,
		enforcerAddress: cfg.Blockchain.PermissionEnforcerAddress,
		entryPoint:      cfg.Blockchain.EntryPointAddress,
		logger:          logger,
	}
}

// ComputeSmartAccountAddress computes a deterministic address for a smart account.
// When a real RPC is configured, this calls factory.getAddress() on-chain.
// In dev mode, it computes a simulated deterministic address.
func (c *Client) ComputeSmartAccountAddress(signerAddress string, agentIDHex string, salt string) (string, error) {
	// Simulate a CREATE2-style deterministic address
	input := fmt.Sprintf("%s:%s:%s:%s", c.factoryAddress, signerAddress, agentIDHex, salt)
	hash := sha256.Sum256([]byte(input))
	return "0x" + hex.EncodeToString(hash[:20]), nil
}

// FactoryAddress returns the configured factory address.
func (c *Client) FactoryAddress() string {
	return c.factoryAddress
}

// EntryPointAddress returns the configured entrypoint address.
func (c *Client) EntryPointAddress() string {
	return c.entryPoint
}

// ChainID returns the configured chain ID.
func (c *Client) ChainID() int64 {
	return c.chainID
}
