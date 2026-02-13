package blockchain

import (
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/google/uuid"
)

// UUIDToBytes32 converts a UUID string to a deterministic [32]byte.
// Uses the raw 16-byte UUID value left-padded in a 32-byte array.
func UUIDToBytes32(id string) [32]byte {
	var result [32]byte
	parsed, err := uuid.Parse(id)
	if err != nil {
		// Fallback: keccak256 hash of the string
		hash := crypto.Keccak256([]byte(id))
		copy(result[:], hash)
		return result
	}
	// Place 16-byte UUID at bytes [16..31] (right-aligned in bytes32)
	copy(result[16:], parsed[:])
	return result
}

// Keccak256String returns keccak256(abi.encodePacked(s)) as [32]byte,
// matching what Solidity keccak256(abi.encodePacked(string)) produces.
func Keccak256String(s string) [32]byte {
	var result [32]byte
	hash := crypto.Keccak256([]byte(s))
	copy(result[:], hash)
	return result
}

// ActionHash computes keccak256(abi.encodePacked(actionType)) for an action string,
// matching the Solidity PermissionEnforcer's hashing.
func ActionHash(actionType string) [32]byte {
	return Keccak256String(strings.ToLower(actionType))
}

// PolicyContentHash computes a deterministic hash of a policy definition's JSON.
func PolicyContentHash(defJSON []byte) [32]byte {
	var result [32]byte
	hash := crypto.Keccak256(defJSON)
	copy(result[:], hash)
	return result
}

// WeiFromString converts a decimal string amount to *big.Int.
// Returns zero if the string is empty or invalid.
func WeiFromString(amount string) *big.Int {
	if amount == "" {
		return big.NewInt(0)
	}
	val, ok := new(big.Int).SetString(amount, 10)
	if !ok {
		return big.NewInt(0)
	}
	return val
}

// HexToAddress converts a hex string to common.Address.
func HexToAddress(hex string) common.Address {
	return common.HexToAddress(hex)
}
