# AgentGuardrail — System Overview

AgentGuardrail is an on-chain permission and policy enforcement layer for AI agents. It answers a specific problem: when you give an autonomous agent access to a crypto wallet, how do you constrain what it can actually do on-chain? Today's approach — trusting the agent's own code not to exceed its mandate — provides no independent guarantee. AgentGuardrail enforces limits at the contract level, so a misbehaving or compromised agent simply cannot execute transactions that violate its policy.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         Dashboard / API                         │
│              (Next.js frontend + Go/Chi REST backend)           │
└───────────────────────────┬────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
     Policy Engine    Pre-flight API    Audit Logger
     (policies,       POST /validate   (offchain +
      permissions)    (simulation)      onchain events)
            │               │               │
└───────────┴───────────────┴───────────────┘
                            │
                    ┌───────▼────────┐
                    │  Sepolia / Base │
                    │  (EVM chain)    │
                    └───────┬────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
  IdentityRegistry   PolicyRegistry   PermissionEnforcer
   (ERC-8004)         (ERC-8004)       (ERC-8004)
          │                 │                 │
          └─────────────────┴────────┬────────┘
                                     │
                          AgentSmartAccount
                           (ERC-4337)
```

---

## ERC-8004: Policies and Permissions

ERC-8004 is the proposed standard this system is built on. It defines a three-contract identity and authorization model for AI agents.

### IdentityRegistry

Every agent gets a unique `bytes32` identity registered in the `IdentityRegistry`. Registration associates the agent ID with an owner address and a metadata payload (name, description). Agents can be deactivated and reactivated by their owner, and `isAgentActive` is checked at enforcement time — a deactivated agent cannot execute anything.

### PolicyRegistry

A **policy** is an on-chain content hash. The owner creates a policy by submitting a `keccak256` hash of the policy document (stored off-chain in the database), which binds the policy's terms to an immutable on-chain fingerprint.

A **permission** links a specific policy to a specific agent for a bounded time window:

```
permission = {
  policyId:   bytes32   // which policy
  agentId:    bytes32   // which agent
  validFrom:  uint256   // unix timestamp
  validUntil: uint256   // 0 = no expiry
  grantor:    address   // who issued it
  active:     bool
}
```

Permissions can be revoked at any time by the grantor. `isPermissionValid` combines the active flag and the time window into a single check.

### PermissionEnforcer

The enforcer holds the **constraints** that give a permission its teeth:

| Constraint | Description |
|---|---|
| `maxValuePerTx` | Max ETH-equivalent value per transaction |
| `maxDailyVolume` | Max ETH-equivalent volume per day |
| `maxTxCount` | Max transactions per day |
| `allowedActions` | Whitelist of `keccak256(target, selector)` hashes |
| `allowedTokens` | ERC-20 token whitelist (`address(0)` = any) |
| `allowedProtocols` | Protocol contract whitelist |
| `allowedChains` | Chain ID whitelist |

`validateAction(agentId, actionHash, actionData)` walks the agent's active permissions, runs every constraint check, and returns `valid: true/false` along with the matching permission ID. Value normalization across tokens is handled by a `PriceOracle` that converts token amounts to ETH-equivalent using Chainlink feeds.

---

## ERC-4337: Smart Accounts

ERC-4337 is Ethereum's account abstraction standard. Instead of EOAs (private key wallets), agents operate through smart contract accounts. This is what makes on-chain enforcement possible — the contract can enforce policy before any transaction executes.

### Account flow

```
Agent code
    │  signs UserOperation
    ▼
Bundler (Alchemy / Pimlico)
    │  submits to
    ▼
EntryPoint (0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789)
    │  calls
    ▼
AgentSmartAccount.validateUserOp()
    ├── verifies ECDSA signature (owner's key)
    ├── calls PermissionEnforcer.validateAction()
    │       └── checks constraints → reverts if violated
    └── prefunds EntryPoint if needed
    │
    ▼  (if valid)
AgentSmartAccount.execute(target, value, calldata)
    ├── calculates transfer fee (GuardrailFeeManager)
    └── calls target contract
```

A transaction that violates policy reverts inside `validateUserOp` — it never reaches `execute`. The agent cannot bypass this because the EntryPoint always calls `validateUserOp` first and the account contract is immutable.

### AgentAccountFactory

Accounts are deployed deterministically via CREATE2:

```
address = CREATE2(owner, agentId, salt)
```

This means the smart account address is computable before deployment — you can fund it before the account contract even exists on-chain.

### Signers

Two signer modes are supported:

- **Wallet signer** — the owner's connected EOA (MetaMask, Rabby) signs UserOperations. Gas for direct `execute()` calls comes from the owner's wallet.
- **Bot signer** — a generated keypair for autonomous agents. The private key is shown once at creation and never stored. The bot EOA needs ETH for gas when submitting UserOperations through the bundler path.

---

## Audit Log

The audit log has two data sources that are merged into a single view.

### Off-chain events

Written synchronously by the Go backend when state-changing API calls succeed: agent registration, policy creation, permission grant/revoke, smart account deployment, pre-flight validation results.

### On-chain events

The backend runs an indexer (`blockchain/indexer.go`) that polls the chain every 12 seconds for five event types emitted by the contracts:

| Event | Contract | Meaning |
|---|---|---|
| `EnforcementResult` | AgentSmartAccount | UserOp validation outcome |
| `ConstraintViolation` | PermissionEnforcer | Specific constraint that was violated |
| `UsageRecorded` | PermissionEnforcer | Action value recorded against daily quota |
| `Executed` | AgentSmartAccount | Transaction successfully executed |
| `AccountCreated` | AgentAccountFactory | New smart account deployed |

Each indexed event is written to `audit_logs` with `source='onchain'`, a `tx_hash`, and a `block_number`. The indexer tracks its position in an `indexer_state` table so it resumes correctly on restart without replaying events.

The dashboard links on-chain entries directly to Etherscan so you can trace from an audit record to the raw transaction.

---

## What's Coming: Intent Capture

### The gap

The current system answers *what happened* — the audit log records every enforcement result, constraint violation, and execution with a cryptographic reference to the on-chain transaction. What it does not yet capture is *why* the agent took an action. Two USDC swaps for the same amount and the same protocol are indistinguishable in the log today even if one was part of a planned rebalance and the other was anomalous behavior.

### Design principle: contract-native, IPFS-backed

The intent layer is designed around a simple rule: **the smart contract is the source of truth, IPFS is the full-payload store, and the API is an observability layer.** There is no database-only path. Any intent can be independently verified — from the chain to IPFS — without trusting the backend at all.

```
Agent
  │
  ▼
POST /api/v1/intents
  │  1. policy ceiling check (constraints ≤ active policy)
  │  2. pin full intent JSON to IPFS → CID
  │  3. call IntentRegistry.registerIntent(intentHash, permissionId, expiresAt, CID)
  │
  ▼
IntentRegistry.sol  ←  source of truth
  stores: intentHash → { state, permissionId, expiresAt, ipfsCid }
  verifies: agent's permissionId is active in PolicyRegistry
  emits: IntentRegistered(intentHash, agent, permissionId, ipfsCid)
  │
  ▼
Agent builds UserOperation with intentHash in calldata
  │
  ▼
AgentSmartAccount.validateUserOp()
  ├── extracts intentHash from calldata
  ├── verifies intent is Registered + not expired  (IntentRegistry)
  ├── marks intent Executing                       (IntentRegistry)
  └── runs policy constraint check                 (PermissionEnforcer)
  │
  ▼
execute() → on-chain transaction
  │
  ▼
Indexer picks up Executed event
  └── fetches full payload from IPFS via on-chain CID
  └── reconciles outcome against intent constraints
```

### Storage layers

| Layer | What it stores | Authority |
|---|---|---|
| `IntentRegistry.sol` | `intentHash → state + CID + permissionId` | Source of truth |
| IPFS | Full intent JSON (targets, assets, constraints, reasoning) | Immutable payload store |
| Database | Indexed cache: CID, status, agentId, actionType — enough to query the dashboard | Derived; recoverable by replaying chain events |

The DB does not duplicate the full intent payload. If it is ever lost or out of sync, the complete intent history is recoverable by replaying `IntentRegistered` events from the chain and fetching each CID from IPFS.

### Execution is gated at the contract level

`AgentSmartAccount.validateUserOp()` will reject any UserOperation that does not carry a valid `intentHash` pointing to a `Registered` intent in `IntentRegistry`. This is enforced at the contract level — the API cannot override it, and neither can a compromised backend. An agent that submits a misleading intent and tries to execute something different still hits `PermissionEnforcer` and reverts.

### What the API provides

The API's role in the intent layer is **observability and reporting**, not enforcement:

- `POST /api/v1/intents` — coordinate submission (policy check → IPFS pin → on-chain registration)
- `GET /api/v1/intents` — query intent history, filter by agent/status/date
- `GET /api/v1/intents/{id}/payload` — retrieve full payload from IPFS via on-chain CID
- `POST /api/v1/validate` — pre-flight simulation with optional intent context
- Dashboard — per-execution intent panel, reconciliation status, anomaly badges where execution deviated from stated intent

### What this enables

**Verifiable audit trail** — every execution links to a full intent payload stored on IPFS with its CID committed on-chain. The chain proves the intent existed and was registered before execution. IPFS proves what it said. No backend trust required.

**Anomaly detection** — an execution with no linked intent, or one whose on-chain parameters don't match the IPFS payload, is immediately visible. A rule like "agent intended to swap $50 but executed $5,000" is caught during reconciliation.

**Policy alignment at submission** — intent constraints are validated against the agent's active policy before anything hits the chain. If an intent requests access to a protocol not on the allowlist, it is rejected before IPFS pinning ever happens.

**Operator visibility at scale** — owners see not just what agents did but what they were trying to accomplish, with a cryptographic link between the two.
