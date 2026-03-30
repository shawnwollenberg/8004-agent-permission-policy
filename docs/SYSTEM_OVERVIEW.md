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

The current system answers *what happened* — the audit log records every enforcement result, constraint violation, and execution with a cryptographic reference to the on-chain transaction. What it does not yet capture is *why* the agent took an action. Two USDC swaps for the same amount and the same protocol are indistinguishable in the log today even if one was part of a planned rebalance and the other was an anomalous behavior.

### What intent capture adds

Before executing a transaction, the agent submits a structured intent to the API:

```json
{
  "agent_id": "0xabc...",
  "intent": "Rebalance portfolio: sell 50 USDC → ETH to restore 60/40 target allocation",
  "reasoning": "ETH allocation has dropped to 35% due to price movement",
  "planned_actions": [
    { "type": "swap", "token_in": "USDC", "token_out": "ETH", "amount": "50" }
  ],
  "context": { "portfolio_value_usd": 1240.00, "current_eth_pct": 0.35 }
}
```

The backend stores this as an `intent_record` and returns an `intent_id`. The agent includes the `intent_id` in the UserOperation calldata. The on-chain enforcer emits it in the `Executed` event, and the indexer links the execution back to the intent.

### What this enables

**Per-action audit trail with reasoning** — every execution in the audit log has a human-readable explanation alongside the transaction hash.

**Anomaly detection** — a swap that has no linked intent, or whose on-chain parameters don't match the stated plan, gets flagged. A rule like "agent submitted intent to swap $50 but executed $5,000" is trivially detectable.

**Policy intent alignment** — intent fields can be validated against the policy before the transaction is submitted. If an agent's stated reasoning mentions a protocol that is not on the allowlist, it can be rejected at the pre-flight stage before anything reaches the chain.

**Operator visibility** — owners can see not just what their agents did but what they were trying to accomplish, making it practical to audit autonomous agent behavior at scale.

### Implementation sketch

| Component | Change |
|---|---|
| New `intent_records` table | `agent_id`, `intent_text`, `planned_actions` (JSONB), `context` (JSONB), `linked_permission_id`, `executed_at`, `tx_hash` |
| `POST /api/v1/agents/{id}/intent` | Accepts intent payload, validates it against the agent's active permission, returns `intent_id` |
| Pre-flight enhancement | `/validate` optionally checks planned actions against constraints and returns per-action pass/fail |
| Indexer | Links `Executed` events back to pending intents using `intent_id` embedded in calldata |
| Dashboard | New "Intent" column in audit log, intent detail panel, anomaly badges where execution deviated from intent |
| SDK | Helper that wraps the submit-intent → execute flow so agent developers don't have to wire this manually |

This keeps the hard enforcement guarantee that already exists — an agent that submits a misleading intent and tries to execute something different still hits the `PermissionEnforcer` and reverts. Intent capture is a visibility and auditability layer on top of enforcement, not a replacement for it.
