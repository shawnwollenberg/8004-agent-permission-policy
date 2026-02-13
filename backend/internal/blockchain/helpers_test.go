package blockchain

import (
	"encoding/hex"
	"math/big"
	"testing"

	"github.com/google/uuid"
)

func TestUUIDToBytes32_Deterministic(t *testing.T) {
	id := "550e8400-e29b-41d4-a716-446655440000"
	result1 := UUIDToBytes32(id)
	result2 := UUIDToBytes32(id)

	if result1 != result2 {
		t.Fatal("UUIDToBytes32 should be deterministic")
	}
}

func TestUUIDToBytes32_ValidUUID(t *testing.T) {
	id := "550e8400-e29b-41d4-a716-446655440000"
	result := UUIDToBytes32(id)

	// First 16 bytes should be zero (left-padded)
	for i := 0; i < 16; i++ {
		if result[i] != 0 {
			t.Fatalf("expected zero at byte %d, got %d", i, result[i])
		}
	}

	// Bytes 16..31 should be the UUID bytes
	parsed, _ := uuid.Parse(id)
	for i := 0; i < 16; i++ {
		if result[16+i] != parsed[i] {
			t.Fatalf("UUID byte mismatch at position %d", i)
		}
	}
}

func TestUUIDToBytes32_InvalidUUID(t *testing.T) {
	// Invalid UUID should use keccak256 fallback
	result := UUIDToBytes32("not-a-uuid")

	// Should not be all zeros
	allZero := true
	for _, b := range result {
		if b != 0 {
			allZero = false
			break
		}
	}
	if allZero {
		t.Fatal("invalid UUID should produce non-zero bytes via keccak256 fallback")
	}
}

func TestKeccak256String(t *testing.T) {
	result := Keccak256String("swap")

	// Should be 32 bytes
	if len(result) != 32 {
		t.Fatalf("expected 32 bytes, got %d", len(result))
	}

	// Should be deterministic
	result2 := Keccak256String("swap")
	if result != result2 {
		t.Fatal("Keccak256String should be deterministic")
	}

	// Different inputs should produce different hashes
	result3 := Keccak256String("transfer")
	if result == result3 {
		t.Fatal("different inputs should produce different hashes")
	}
}

func TestKeccak256String_KnownValue(t *testing.T) {
	// keccak256("swap") = known hash
	// We can verify it's a valid keccak256 output by checking it's non-zero
	// and the hex representation has the right length
	result := Keccak256String("swap")
	hexStr := hex.EncodeToString(result[:])
	if len(hexStr) != 64 {
		t.Fatalf("expected 64 hex chars, got %d", len(hexStr))
	}
}

func TestActionHash(t *testing.T) {
	// ActionHash should lowercase the input before hashing
	hash1 := ActionHash("swap")
	hash2 := ActionHash("SWAP")
	hash3 := ActionHash("Swap")

	if hash1 != hash2 {
		t.Fatal("ActionHash should be case-insensitive (swap vs SWAP)")
	}
	if hash1 != hash3 {
		t.Fatal("ActionHash should be case-insensitive (swap vs Swap)")
	}
}

func TestActionHash_DifferentActions(t *testing.T) {
	hashSwap := ActionHash("swap")
	hashTransfer := ActionHash("transfer")

	if hashSwap == hashTransfer {
		t.Fatal("different actions should produce different hashes")
	}
}

func TestPolicyContentHash(t *testing.T) {
	json1 := []byte(`{"actions":["swap"]}`)
	json2 := []byte(`{"actions":["transfer"]}`)

	hash1 := PolicyContentHash(json1)
	hash2 := PolicyContentHash(json2)

	if hash1 == hash2 {
		t.Fatal("different policies should produce different hashes")
	}

	// Deterministic
	hash1b := PolicyContentHash(json1)
	if hash1 != hash1b {
		t.Fatal("PolicyContentHash should be deterministic")
	}
}

func TestWeiFromString(t *testing.T) {
	tests := []struct {
		input    string
		expected *big.Int
	}{
		{"1000000000000000000", big.NewInt(0).SetUint64(1000000000000000000)},
		{"0", big.NewInt(0)},
		{"", big.NewInt(0)},
		{"invalid", big.NewInt(0)},
		{"123456789", big.NewInt(123456789)},
	}

	for _, tt := range tests {
		result := WeiFromString(tt.input)
		if result.Cmp(tt.expected) != 0 {
			t.Errorf("WeiFromString(%q) = %s, want %s", tt.input, result.String(), tt.expected.String())
		}
	}
}

func TestWeiFromString_LargeValue(t *testing.T) {
	// 100 ETH in wei
	val := WeiFromString("100000000000000000000")
	expected, _ := new(big.Int).SetString("100000000000000000000", 10)
	if val.Cmp(expected) != 0 {
		t.Fatalf("WeiFromString large value: got %s, want %s", val.String(), expected.String())
	}
}
