package blockchain

import (
	"testing"

	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/config"
)

func TestNewClient_SimulatedMode(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{
			RPCURL:  "https://example.com",
			ChainID: 11155111,
		},
	}
	logger := zerolog.Nop()

	client := NewClient(cfg, logger)
	if !client.IsSimulated() {
		t.Fatal("expected simulated mode when no deployer key")
	}
}

func TestNewClient_InvalidKey(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{
			RPCURL:             "https://example.com",
			ChainID:            11155111,
			DeployerPrivateKey: "not_a_valid_key",
		},
	}
	logger := zerolog.Nop()

	client := NewClient(cfg, logger)
	if !client.IsSimulated() {
		t.Fatal("expected simulated mode with invalid deployer key")
	}
}

func TestClient_FactoryAddress(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{
			SmartAccountFactoryAddress: "0x1234567890abcdef",
		},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	if client.FactoryAddress() != "0x1234567890abcdef" {
		t.Fatalf("expected factory address, got %s", client.FactoryAddress())
	}
}

func TestClient_EntryPointAddress(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{
			EntryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
		},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	if client.EntryPointAddress() != "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" {
		t.Fatalf("expected entry point address, got %s", client.EntryPointAddress())
	}
}

func TestClient_ChainID(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{
			ChainID: 11155111,
		},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	if client.ChainID() != 11155111 {
		t.Fatalf("expected chain ID 11155111, got %d", client.ChainID())
	}
}

func TestComputeSmartAccountAddress_Simulated(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{
			SmartAccountFactoryAddress: "0xFactory",
		},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	addr, err := client.ComputeSmartAccountAddress("0xSigner", "agent-id-123", "0xSalt")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if addr == "" {
		t.Fatal("expected non-empty address")
	}
	if len(addr) < 42 {
		t.Fatalf("expected valid hex address, got %s", addr)
	}

	// Should be deterministic
	addr2, _ := client.ComputeSmartAccountAddress("0xSigner", "agent-id-123", "0xSalt")
	if addr != addr2 {
		t.Fatal("simulated address should be deterministic")
	}

	// Different inputs should give different addresses
	addr3, _ := client.ComputeSmartAccountAddress("0xOtherSigner", "agent-id-123", "0xSalt")
	if addr == addr3 {
		t.Fatal("different inputs should produce different addresses")
	}
}

func TestRegisterAgent_Simulated(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	agentID := UUIDToBytes32("550e8400-e29b-41d4-a716-446655440000")
	result, err := client.RegisterAgent(nil, agentID, "test-agent")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result == "" {
		t.Fatal("expected non-empty result")
	}
	if len(result) < 10 {
		t.Fatal("expected simulated registry ID to have meaningful length")
	}
}

func TestCreateSmartAccount_Simulated(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	var agentID, salt [32]byte
	copy(agentID[:], []byte("test-agent"))
	copy(salt[:], []byte("test-salt"))

	addr, txHash, err := client.CreateSmartAccount(nil, [20]byte{}, agentID, salt)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if addr == "" {
		t.Fatal("expected non-empty address")
	}
	if len(txHash) < 10 || txHash[:2] != "0x" {
		t.Fatalf("expected hex tx hash, got %s", txHash)
	}
}

func TestGrantPermission_Simulated(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	var policyHash, agentID [32]byte
	copy(policyHash[:], []byte("policy"))
	copy(agentID[:], []byte("agent"))

	permID, txHash, err := client.GrantPermission(nil, policyHash, agentID, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if permID == "" {
		t.Fatal("expected non-empty permission ID")
	}
	if len(txHash) < 10 || txHash[:2] != "0x" {
		t.Fatalf("expected hex tx hash, got %s", txHash)
	}
}

func TestSetConstraints_Simulated(t *testing.T) {
	cfg := &config.Config{
		Blockchain: config.BlockchainConfig{},
	}
	logger := zerolog.Nop()
	client := NewClient(cfg, logger)

	var permID [32]byte
	txHash, err := client.SetConstraints(
		nil, permID, nil, nil, nil, nil, nil, nil, nil,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(txHash) < 10 || txHash[:2] != "0x" {
		t.Fatalf("expected hex tx hash, got %s", txHash)
	}
}
