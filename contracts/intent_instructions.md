# AgentGuardrail: Add an Intent Layer

## Objective

Add an intent-enforced execution layer so that NO agent action can execute unless a valid intent exists first.

The system must:
- Capture intent before execution
- Enforce constraints (bounded by policy ceiling)
- Register intent commitment on-chain
- Link execution to intent
- Reconcile outcome vs intent
- Produce full audit logs

---

## Core Principle

NO EXECUTION WITHOUT INTENT

Execution flow:
Intent → Policy Check (auto) → On-Chain Registration → Execution → Reconciliation → Audit Log

---

## Non-Goals (v1)

- No full ERC-7683 compliance
- No decentralized storage requirement
- No solver marketplace
- No manual approval gate — intent is captured and auto-validated against policy

Focus on enforcement + auditability.

---

## Architecture Overview

Components:

1. Intent Model
2. Intent Store (DB)
3. IntentRegistry.sol (on-chain commitment store)
4. Intent Enforcement Layer (AgentSmartAccount + PermissionEnforcer)
5. Execution Linker
6. Reconciliation Layer
7. Audit Log (extended audit_logs table)

---

## Key Design Decisions (locked)

**No manual approval.**
Intent submission triggers an automatic policy ceiling check. If it passes, the intent is registered on-chain immediately. If it fails, the intent is auto-rejected with the violation reason logged. No human gate exists.

**Policy is the ceiling.**
`intent.constraints` can only be equal to or more restrictive than the agent's active policy. An intent can never grant more than the policy allows. Policy ceiling is enforced at submission time.

**ERC-8004 integration from day one.**
Every intent is tied to the agent's ERC-8004 `permissionId`. The `intentHash` is derived from intent fields + `permissionId`. On-chain, `IntentRegistry` verifies the agent's permission is active in `PolicyRegistry` before accepting registration.

**Audit via extended audit_logs.**
No separate `intent_audit_events` table. The existing `audit_logs` table gets an optional `intent_id` FK column. Intent lifecycle events are new `event_type` values in the same table alongside existing `onchain`/`offchain` events.

**Enforcement separation.**
`AgentSmartAccount.validateUserOp()` owns intent gating (verifies intent exists, is valid, not expired). `PermissionEnforcer` owns policy constraint checking. These remain separate responsibilities.

---

## Intent Lifecycle

Statuses:
- `pending` — created, policy check in progress
- `submitted` — policy check passed, registered on-chain
- `rejected` — auto-rejected due to policy violation (terminal)
- `expired` — past `expiresAt` before execution (terminal)
- `executing` — execution in progress
- `executed` — execution completed on-chain
- `failed` — execution failed
- `reconciled` — outcome verified against intent (terminal)

Rules:
- Only `submitted` intents can move to `executing`
- Expired intents cannot execute
- Every execution must reference an `intentId`
- Single-use intents cannot be reused (default behavior; reusable session intents are post-v1)

---

## Intent Model

IntentRecord:

- intentId (string)
- agentId (string)
- agentWallet (string)
- permissionId (string) — ERC-8004 permission reference

- status (IntentStatus)
- actionType (string)
- chainId (number)

- target:
  - chainId
  - protocol (optional)
  - contractAddress (optional)
  - functionSelector (optional)

- inputAssets[]:
  - chainId
  - tokenAddress
  - amount

- outputAssets[]:
  - chainId
  - tokenAddress
  - minAmount (optional)

- constraints:
  - maxSpend
  - minReceive
  - slippageBps
  - allowedChains[]
  - allowedProtocols[]
  - allowedContracts[]
  - recipientAllowlist[]
  - expiresAt
  - (must be ≤ policy ceiling on all fields)

- expectedOutcome:
  - description

- intentHash (bytes32)
- signature (optional, EIP-712)

- createdAt
- updatedAt

- executionRefs[]
- reconciliationSummary:
  - status (match | deviation | failed)
  - reason (optional)

---

## Intent Hashing

Requirements:
- Deterministic
- Exclude mutable fields (status, timestamps)
- Include:
  - agentId
  - permissionId
  - actionType
  - chainId
  - target
  - inputAssets
  - outputAssets
  - constraints
  - expectedOutcome

Functions:
- `buildCanonicalIntentPayload(intent)`
- `hashIntentPayload(payload)` → bytes32

---

## On-Chain: IntentRegistry.sol

New contract. Stores intent hash commitments on-chain (not full intent data).

Methods:
- `registerIntent(bytes32 intentHash, address agent, bytes32 permissionId, uint256 expiresAt)`
  - Verifies agent's permissionId is active in PolicyRegistry before accepting
  - Emits `IntentRegistered(intentHash, agent, permissionId, expiresAt)`
- `markExecuting(bytes32 intentHash)` — called by AgentSmartAccount during validateUserOp
- `markExecuted(bytes32 intentHash)` — called after successful execution
- `markFailed(bytes32 intentHash)`
- `getIntentState(bytes32 intentHash)` → state

State enum: `Unknown | Registered | Executing | Executed | Failed`

Events indexed by backend indexer:
- `IntentRegistered`
- `IntentStateChanged`

---

## AgentSmartAccount Changes

`validateUserOp()` updated to:
1. Extract `intentHash` from UserOperation calldata (first 32 bytes after magic prefix)
2. Call `IntentRegistry.getIntentState(intentHash)` — must be `Registered`
3. Verify `expiresAt` not passed
4. Call `IntentRegistry.markExecuting(intentHash)`
5. Proceed to `PermissionEnforcer` for policy constraint check

Execution fails if:
- `intentHash` missing from calldata
- Intent not found in `IntentRegistry`
- Intent not in `Registered` state
- Intent expired
- Policy constraints violated (existing PermissionEnforcer logic)

---

## Backend Services

Intent Management:
- `createIntent(input)` — creates record in `pending`, runs policy ceiling check
  - If passes → calls `IntentRegistry.registerIntent()` via relayer, status → `submitted`
  - If fails → status → `rejected`, violation logged to audit_logs
- `submitIntent(intentId)` — internal, triggers on-chain registration
- `rejectIntent(intentId, reason)` — internal, auto only

Execution:
- `validateIntentForExecution(intentId, request)` — pre-flight check before UserOp is built
- `beginIntentExecution(intentId)` — status → `executing`
- `completeIntentExecution(intentId, result)` — status → `executed`
- `failIntentExecution(intentId, error)` — status → `failed`

Reconciliation:
- `reconcileIntent(intentId, executionArtifacts)` — consumes indexed on-chain events, status → `reconciled`

---

## Enforcement (CRITICAL)

ALL execution must include a valid `intentHash` in the UserOperation calldata.

Reject execution if:
- intentHash missing
- intent not in IntentRegistry
- intent not in Registered state
- intent expired
- wrong chain
- wrong protocol
- contract not in allowedContracts
- spend exceeds maxSpend
- recipient not in recipientAllowlist

Enforced in `AgentSmartAccount.validateUserOp()` — NOT middleware.

---

## Reconciliation Rules

Swap:
- spend ≤ maxSpend
- receive ≥ minReceive
- slippage within slippageBps

NFT Buy:
- correct contract
- price ≤ maxPrice

Transfer:
- recipient in recipientAllowlist
- amount valid

Contract Call:
- contract in allowedContracts
- value within limits

Output:
- `match` — all constraints satisfied
- `deviation` — within tolerance but not exact
- `failed` — constraint violated post-execution

---

## Audit Log

Extend existing `audit_logs` table:
- Add `intent_id` (UUID, nullable FK → intents)

New event_type values (added to existing set):
- `intent.created`
- `intent.submitted`
- `intent.rejected`
- `intent.execution_started`
- `intent.execution_succeeded`
- `intent.execution_failed`
- `intent.reconciled`
- `intent.policy_violation`

All intent events use existing `source`, `tx_hash`, `block_number` fields where applicable. Append-only.

---

## EIP-712

Prepare functions:
- `buildIntentTypedData(intent)`
- `verifyIntentSignature(...)`

Domain includes:
- intentId
- agentId
- agentWallet
- permissionId
- actionType
- chainId
- constraints
- expiresAt
- intentHash

---

## Storage

New tables:
- `intents` — full intent records
- `intent_execution_links` — maps intentId → txHash / UserOp

Modified tables:
- `audit_logs` — add `intent_id` nullable FK column

---

## On-Chain Indexer Changes

Add to existing indexer (`backend/internal/blockchain/indexer.go`):
- Poll `IntentRegistry` for `IntentRegistered` and `IntentStateChanged` events
- Write to `audit_logs` with `source='onchain'`, `intent_id`, `tx_hash`, `block_number`

---

## API Endpoints

- `POST /api/v1/intents` — create intent (triggers auto policy check + on-chain registration)
- `POST /api/v1/intents/{id}/execute` — begin execution (validates intent state, returns intentHash for calldata)
- `GET /api/v1/intents/{id}` — get intent + reconciliation summary
- `GET /api/v1/intents` — list intents (filter by agentId, status)
- `POST /api/v1/validate` — pre-flight check accepts optional `intentId` for richer simulation

---

## Code Structure

```
backend/internal/intent/
  model/       — IntentRecord, IntentStatus, IntentConstraints
  hash/        — buildCanonicalIntentPayload, hashIntentPayload
  service/     — createIntent, submitIntent, beginExecution, completeExecution, reconcile
  policy/      — policy ceiling check (compares intent.constraints vs active policy)
  reconcile/   — reconciliation logic per action type
  audit/       — appendAuditEvent (writes to audit_logs with intent_id)

contracts/src/
  IntentRegistry.sol   — new
  AgentSmartAccount.sol — updated (intent gating in validateUserOp)
```

---

## Required Flows

Swap:
- `POST /api/v1/intents` → auto policy check → on-chain registration → intentHash returned
- Agent builds UserOp with intentHash in calldata
- `validateUserOp`: intent check → permission check → execute
- Indexer picks up events → reconcile

NFT Buy:
- Same flow; reconciliation verifies contract address + price ≤ maxPrice

Contract Call:
- Same flow; reconciliation verifies contract in allowedContracts + value within limits

---

## Open Questions (to resolve before implementation)

1. **Who calls `IntentRegistry.registerIntent`?**
   Options: (a) backend relayer using `DEPLOYER_PRIVATE_KEY` (consistent with existing deploy pattern), or (b) agent wallet sends the tx itself.
   Leaning toward: relayer, for consistency.

2. **callData encoding for intentHash**
   Where exactly does intentHash live in the UserOperation? Proposal: first 32 bytes prefixed with a 4-byte magic selector. `validateUserOp` extracts it before routing to execution calldata.

3. **PermissionEnforcer awareness of intents**
   Current leaning: `AgentSmartAccount` handles intent gating entirely; `PermissionEnforcer` stays focused on policy constraints only. Should `PermissionEnforcer` receive intentHash as a param for event emission, or remain unaware?

---

## Acceptance Criteria

- Execution fails without a valid intentHash in calldata
- Intents persist with full lifecycle in DB
- Intent hash is deterministic and tied to permissionId
- IntentRegistry rejects intents for agents without active permissions
- Execution enforces intent constraints (bounded by policy)
- Execution links to intent via executionRefs
- Reconciliation runs post-execution and updates status
- Audit logs capture complete intent lifecycle with tx_hash where applicable

---

## Optional (after core)

- Human-readable intent summaries
- Exportable intent reports
- Reusable session intents
- Solver marketplace integration (ERC-7683)

---

## Final Goal

AgentGuardrail becomes:

Intent-enforced execution + verifiable audit system for agents

Every action answers:
- What was intended?
- Who authorized it?
- What happened?
- Did it match?
