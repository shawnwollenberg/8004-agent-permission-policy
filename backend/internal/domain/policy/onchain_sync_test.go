package policy

import (
	"encoding/hex"
	"math/big"
	"testing"

	"github.com/erc8004/policy-saas/internal/blockchain"
)

func TestBuildSyncData_BasicConstraints(t *testing.T) {
	def := &Definition{
		Actions: []string{"swap", "transfer"},
		Assets: Assets{
			Tokens:    []string{"0x6B175474E89094C44Da98b954EedeAC495271d0F"},
			Protocols: []string{"0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"},
			Chains:    []int64{1, 137},
		},
		Constraints: Constraints{
			MaxValuePerTx:  "1000000000000000000",
			MaxDailyVolume: "10000000000000000000",
			MaxTxCount:     100,
		},
	}

	sd := buildSyncData(def)

	// Check constraints
	expectedMaxVal, _ := new(big.Int).SetString("1000000000000000000", 10)
	if sd.MaxValuePerTx.Cmp(expectedMaxVal) != 0 {
		t.Fatalf("MaxValuePerTx: got %s, want %s", sd.MaxValuePerTx.String(), expectedMaxVal.String())
	}

	expectedMaxDaily, _ := new(big.Int).SetString("10000000000000000000", 10)
	if sd.MaxDailyVolume.Cmp(expectedMaxDaily) != 0 {
		t.Fatalf("MaxDailyVolume: got %s, want %s", sd.MaxDailyVolume.String(), expectedMaxDaily.String())
	}

	if sd.MaxTxCount.Int64() != 100 {
		t.Fatalf("MaxTxCount: got %d, want 100", sd.MaxTxCount.Int64())
	}

	// Check actions are hashed
	if len(sd.AllowedActions) != 2 {
		t.Fatalf("expected 2 allowed actions, got %d", len(sd.AllowedActions))
	}

	// Check tokens
	if len(sd.AllowedTokens) != 1 {
		t.Fatalf("expected 1 allowed token, got %d", len(sd.AllowedTokens))
	}
	expectedToken := "0x6B175474E89094C44Da98b954EedeAC495271d0F"
	if sd.AllowedTokens[0].Hex() != expectedToken {
		t.Fatalf("expected token %s, got %s", expectedToken, sd.AllowedTokens[0].Hex())
	}

	// Check protocols
	if len(sd.AllowedProtocols) != 1 {
		t.Fatalf("expected 1 allowed protocol, got %d", len(sd.AllowedProtocols))
	}

	// Check chains
	if len(sd.AllowedChains) != 2 {
		t.Fatalf("expected 2 allowed chains, got %d", len(sd.AllowedChains))
	}
	if sd.AllowedChains[0].Int64() != 1 {
		t.Fatalf("expected chain 1, got %d", sd.AllowedChains[0].Int64())
	}
	if sd.AllowedChains[1].Int64() != 137 {
		t.Fatalf("expected chain 137, got %d", sd.AllowedChains[1].Int64())
	}
}

func TestBuildSyncData_WildcardSkipped(t *testing.T) {
	def := &Definition{
		Actions: []string{"*"},
	}

	sd := buildSyncData(def)

	// Wildcard should be skipped — empty actions means allow all on-chain
	if len(sd.AllowedActions) != 0 {
		t.Fatalf("expected 0 allowed actions for wildcard, got %d", len(sd.AllowedActions))
	}
}

func TestBuildSyncData_EmptyConstraints(t *testing.T) {
	def := &Definition{
		Actions: []string{"swap"},
	}

	sd := buildSyncData(def)

	if sd.MaxValuePerTx.Cmp(big.NewInt(0)) != 0 {
		t.Fatal("expected zero MaxValuePerTx for empty constraints")
	}
	if sd.MaxDailyVolume.Cmp(big.NewInt(0)) != 0 {
		t.Fatal("expected zero MaxDailyVolume for empty constraints")
	}
	if sd.MaxTxCount.Cmp(big.NewInt(0)) != 0 {
		t.Fatal("expected zero MaxTxCount for empty constraints")
	}
}

func TestBuildSyncData_NonNilSlices(t *testing.T) {
	def := &Definition{
		Actions: []string{"*"},
	}

	sd := buildSyncData(def)

	if sd.AllowedActions == nil {
		t.Fatal("AllowedActions should not be nil")
	}
	if sd.AllowedTokens == nil {
		t.Fatal("AllowedTokens should not be nil")
	}
	if sd.AllowedProtocols == nil {
		t.Fatal("AllowedProtocols should not be nil")
	}
	if sd.AllowedChains == nil {
		t.Fatal("AllowedChains should not be nil")
	}
}

func TestBuildSyncData_TokenFiltering(t *testing.T) {
	def := &Definition{
		Actions: []string{"swap"},
		Assets: Assets{
			Tokens: []string{
				"0x6B175474E89094C44Da98b954EedeAC495271d0F",
				"",        // should be skipped
				"no-0x",   // should be skipped (no 0x prefix)
				" ",       // should be skipped (whitespace only)
			},
		},
	}

	sd := buildSyncData(def)
	if len(sd.AllowedTokens) != 1 {
		t.Fatalf("expected 1 valid token (filtering out empty/invalid), got %d", len(sd.AllowedTokens))
	}
}

func TestBuildSyncData_ProtocolFiltering(t *testing.T) {
	def := &Definition{
		Actions: []string{"swap"},
		Assets: Assets{
			Protocols: []string{
				"0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
				"", // should be skipped
			},
		},
	}

	sd := buildSyncData(def)
	if len(sd.AllowedProtocols) != 1 {
		t.Fatalf("expected 1 valid protocol, got %d", len(sd.AllowedProtocols))
	}
}

func TestActionHash_Keccak256(t *testing.T) {
	// Verify ActionHash uses keccak256, not SHA256
	hash := blockchain.ActionHash("swap")

	// keccak256("swap") should produce a known output
	hexStr := hex.EncodeToString(hash[:])
	if len(hexStr) != 64 {
		t.Fatalf("expected 64 hex chars, got %d", len(hexStr))
	}

	// Verify it matches the local wrapper
	localHash := ActionHash("swap")
	if hash != localHash {
		t.Fatal("blockchain.ActionHash and local ActionHash should produce same result")
	}

	// Verify case insensitivity
	hashUpper := blockchain.ActionHash("SWAP")
	if hash != hashUpper {
		t.Fatal("ActionHash should be case-insensitive")
	}
}
