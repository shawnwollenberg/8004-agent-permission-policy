package blockchain

import (
	"fmt"
	"sort"

	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/config"
)

// MultiClient holds one Client per supported chain, keyed by chain ID.
type MultiClient struct {
	clients map[int64]*Client
	primary int64
	logger  zerolog.Logger
}

// NewMultiClient creates a MultiClient from the Chains config map.
// primaryChainID identifies which chain to use as the default.
func NewMultiClient(chains map[int64]config.BlockchainConfig, primaryChainID int64, logger zerolog.Logger) *MultiClient {
	mc := &MultiClient{
		clients: make(map[int64]*Client, len(chains)),
		primary: primaryChainID,
		logger:  logger,
	}

	for chainID, bcfg := range chains {
		c := NewClientFromBlockchainConfig(bcfg, logger.With().Int64("chain_id", chainID).Logger())
		mc.clients[chainID] = c
		logger.Info().Int64("chain_id", chainID).Bool("simulated", c.IsSimulated()).Msg("multi-client: registered chain")
	}

	return mc
}

// ForChain returns the Client for the given chain ID.
// Returns an error if the chain is not configured.
func (mc *MultiClient) ForChain(chainID int64) (*Client, error) {
	c, ok := mc.clients[chainID]
	if !ok {
		return nil, fmt.Errorf("chain %d is not configured", chainID)
	}
	return c, nil
}

// Primary returns the Client for the primary chain.
func (mc *MultiClient) Primary() *Client {
	return mc.clients[mc.primary]
}

// SupportedChains returns a sorted list of all configured chain IDs.
func (mc *MultiClient) SupportedChains() []int64 {
	ids := make([]int64, 0, len(mc.clients))
	for id := range mc.clients {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	return ids
}
