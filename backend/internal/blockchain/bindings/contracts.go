// Package bindings provides typed wrappers for the on-chain contracts.
// These are lightweight bindings that use go-ethereum's abi package directly
// rather than abigen-generated code. For full generated bindings, run:
//   bash scripts/gen_bindings.sh
package bindings

import (
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
)

// --- IdentityRegistry ---

const identityRegistryABI = `[
	{"type":"function","name":"registerAgent","inputs":[{"name":"agentId","type":"bytes32"},{"name":"metadata","type":"string"}],"outputs":[],"stateMutability":"nonpayable"},
	{"type":"function","name":"getAgent","inputs":[{"name":"agentId","type":"bytes32"}],"outputs":[{"name":"owner","type":"address"},{"name":"metadata","type":"string"},{"name":"active","type":"bool"},{"name":"registeredAt","type":"uint256"}],"stateMutability":"view"},
	{"type":"function","name":"isAgentActive","inputs":[{"name":"agentId","type":"bytes32"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"view"}
]`

type IdentityRegistry struct {
	*bind.BoundContract
}

func NewIdentityRegistry(address common.Address, backend bind.ContractBackend) (*IdentityRegistry, error) {
	parsed, err := abi.JSON(strings.NewReader(identityRegistryABI))
	if err != nil {
		return nil, err
	}
	contract := bind.NewBoundContract(address, parsed, backend, backend, backend)
	return &IdentityRegistry{contract}, nil
}

func (c *IdentityRegistry) RegisterAgent(opts *bind.TransactOpts, agentId [32]byte, metadata string) (*bind.BoundContract, error) {
	// Return the contract so caller can use Transact
	return c.BoundContract, nil
}

// --- PolicyRegistry ---

const policyRegistryABI = `[
	{"type":"function","name":"createPolicy","inputs":[{"name":"contentHash","type":"bytes32"}],"outputs":[{"name":"policyId","type":"bytes32"}],"stateMutability":"nonpayable"},
	{"type":"function","name":"grantPermission","inputs":[{"name":"policyId","type":"bytes32"},{"name":"agentId","type":"bytes32"},{"name":"validFrom","type":"uint256"},{"name":"validUntil","type":"uint256"}],"outputs":[{"name":"permissionId","type":"bytes32"}],"stateMutability":"nonpayable"},
	{"type":"function","name":"getPermission","inputs":[{"name":"permissionId","type":"bytes32"}],"outputs":[{"name":"policyId","type":"bytes32"},{"name":"agentId","type":"bytes32"},{"name":"owner","type":"address"},{"name":"validFrom","type":"uint256"},{"name":"validUntil","type":"uint256"},{"name":"active","type":"bool"}],"stateMutability":"view"},
	{"type":"function","name":"isPermissionValid","inputs":[{"name":"permissionId","type":"bytes32"}],"outputs":[{"name":"","type":"bool"}],"stateMutability":"view"}
]`

type PolicyRegistry struct {
	*bind.BoundContract
}

func NewPolicyRegistry(address common.Address, backend bind.ContractBackend) (*PolicyRegistry, error) {
	parsed, err := abi.JSON(strings.NewReader(policyRegistryABI))
	if err != nil {
		return nil, err
	}
	contract := bind.NewBoundContract(address, parsed, backend, backend, backend)
	return &PolicyRegistry{contract}, nil
}

// --- PermissionEnforcer ---

const permissionEnforcerABI = `[
	{"type":"function","name":"setConstraints","inputs":[{"name":"permissionId","type":"bytes32"},{"name":"maxValuePerTx","type":"uint256"},{"name":"maxDailyVolume","type":"uint256"},{"name":"maxTxCount","type":"uint256"},{"name":"allowedActions","type":"bytes32[]"},{"name":"allowedTokens","type":"address[]"},{"name":"allowedProtocols","type":"address[]"},{"name":"allowedChains","type":"uint256[]"}],"outputs":[],"stateMutability":"nonpayable"},
	{"type":"function","name":"permissionConstraints","inputs":[{"name":"","type":"bytes32"}],"outputs":[{"name":"maxValuePerTx","type":"uint256"},{"name":"maxDailyVolume","type":"uint256"},{"name":"maxTxCount","type":"uint256"}],"stateMutability":"view"},
	{"type":"function","name":"validateAction","inputs":[{"name":"permissionId","type":"bytes32"},{"name":"agentId","type":"bytes32"},{"name":"actionType","type":"bytes32"},{"name":"actionData","type":"bytes"}],"outputs":[{"name":"allowed","type":"bool"},{"name":"reason","type":"string"}],"stateMutability":"view"}
]`

type PermissionEnforcer struct {
	*bind.BoundContract
}

func NewPermissionEnforcer(address common.Address, backend bind.ContractBackend) (*PermissionEnforcer, error) {
	parsed, err := abi.JSON(strings.NewReader(permissionEnforcerABI))
	if err != nil {
		return nil, err
	}
	contract := bind.NewBoundContract(address, parsed, backend, backend, backend)
	return &PermissionEnforcer{contract}, nil
}

// ConstraintsResult holds the output of permissionConstraints()
type ConstraintsResult struct {
	MaxValuePerTx  *big.Int
	MaxDailyVolume *big.Int
	MaxTxCount     *big.Int
}

// --- AgentAccountFactory ---

const agentAccountFactoryABI = `[
	{"type":"function","name":"createAccount","inputs":[{"name":"owner","type":"address"},{"name":"agentId","type":"bytes32"},{"name":"salt","type":"bytes32"}],"outputs":[{"name":"account","type":"address"}],"stateMutability":"nonpayable"},
	{"type":"function","name":"getAddress","inputs":[{"name":"owner","type":"address"},{"name":"agentId","type":"bytes32"},{"name":"salt","type":"bytes32"}],"outputs":[{"name":"","type":"address"}],"stateMutability":"view"}
]`

type AgentAccountFactory struct {
	*bind.BoundContract
}

func NewAgentAccountFactory(address common.Address, backend bind.ContractBackend) (*AgentAccountFactory, error) {
	parsed, err := abi.JSON(strings.NewReader(agentAccountFactoryABI))
	if err != nil {
		return nil, err
	}
	contract := bind.NewBoundContract(address, parsed, backend, backend, backend)
	return &AgentAccountFactory{contract}, nil
}
