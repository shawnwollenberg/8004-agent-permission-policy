# AgentGuardrail: Add an Intent Layer

## Objective

Add an intent-enforced execution layer so that NO agent action can execute unless a valid intent exists first.

The system must:
- Capture intent before execution
- Enforce constraints (bounded by policy ceiling)
- Register intent commitment on-chain
- Store full intent payload on IPFS
- Link execution to intent
- Reconcile outcome vs intent
- Surface full audit trail via API (observability only)

---

## Core Principle

NO EXECUTION WITHOUT INTENT

Execution flow:
Intent → IPFS Storage → On-Chain Registration → Execution → Reconciliation → Audit Log

The smart contract is the source of truth. IPFS is the full-payload store. The API is an observability and reporting layer over those two sources.

---

## Non-Goals (v1)

- No full ERC-7683 compliance
- No solver marketplace
- No manual approval gate — intent is captured and auto-validated against policy
- The database is NOT the primary intent store — it is an indexed cache for querying

Focus on enforcement + auditability.

---

## Architecture Overview

Components:

1. Intent Model
2. IntentRegistry.sol (on-chain commitment store — source of truth)
3. IPFS (full intent payload store)
4. Intent Enforcement Layer (AgentSmartAccount + PermissionEnforcer)
5. Execution Linker
6. Reconciliation Layer
7. API (observability + reporting only)
8. DB (indexed cache of IPFS CIDs, on-chain state, and execution links — derived, not authoritative)

---

## Key Design Decisions (locked)

**Smart contract is the source of truth.**
`IntentRegistry.sol` holds the binding record. The IPFS CID is committed on-chain so the full intent payload is always recoverable from the chain, independent of any backend service. The database is a queryable index of on-chain state — not an authority.

**IPFS stores the full payload.**
Before on-chain registration, the full intent JSON is pinned to IPFS. The resulting CID is included in the on-chain `registerIntent` call. Anyone can retrieve the full intent from the chain-committed CID without trusting the backend.

**No manual approval.**
Intent submission triggers an automatic policy ceiling check. If it passes, the intent is pinned to IPFS and registered on-chain immediately. If it fails, the intent is auto-rejected with the violation reason logged. No human gate exists.

**Policy is the ceiling.**
`intent.constraints` can only be equal to or more restrictive than the agent's active policy. An intent can never grant more than the policy allows. Policy ceiling is enforced at submission time.

**ERC-8004 integration from day one.**
Every intent is tied to the agent's ERC-8004 `permissionId`. The `intentHash` is derived from intent fields + `permissionId`. On-chain, `IntentRegistry` verifies the agent's permission is active in `PolicyRegistry` before accepting registration.

**API is observability only.**
The API does not gate execution. It provides pre-flight simulation, intent status queries, reconciliation summaries, and reporting. The hard enforcement lives entirely in `AgentSmartAccount.validateUserOp()` and `IntentRegistry`.

**Audit via extended audit_logs.**
No separate `intent_audit_events` table. The existing `audit_logs` table gets an optional `intent_id` FK column. Intent lifecycle events are new `event_type` values in the same table alongside existing `onchain`/`offchain` events.

**Enforcement separation.**
`AgentSmartAccount.validateUserOp()` owns intent gating (verifies intent exists, is valid, not expired). `PermissionEnforcer` owns policy constraint checking. These remain separate responsibilities.

---

## Intent Lifecycle

Statuses:
- `pending` — created, policy check in progress
- `submitted` — pinned to IPFS + registered on-chain (terminal until execution)
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
- Single-use intents cannot be reused (default; reusable session intents are post-v1)

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

- intentHash (bytes32) — deterministic hash of canonical payload
- ipfsCid (string) — CID of full intent JSON pinned to IPFS
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
- Exclude mutable fields (status, timestamps, ipfsCid)
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

The IPFS CID is computed from the full intent JSON (including mutable fields), so it captures the complete record at the time of submission.

---

## On-Chain: IntentRegistry.sol

New contract. Stores intent hash commitments and IPFS CIDs on-chain. Does not store full intent data.

Methods:
- `registerIntent(bytes32 intentHash, address agent, bytes32 permissionId, uint256 expiresAt, string calldata ipfsCid)`
  - Verifies agent's permissionId is active in PolicyRegistry before accepting
  - Emits `IntentRegistered(intentHash, agent, permissionId, expiresAt, ipfsCid)`
- `markExecuting(bytes32 intentHash)` — called by AgentSmartAccount during validateUserOp
- `markExecuted(bytes32 intentHash)` — called after successful execution
- `markFailed(bytes32 intentHash)`
- `getIntentState(bytes32 intentHash)` → state
- `getIntentCid(bytes32 intentHash)` → ipfsCid — allows full payload retrieval without backend

State enum: `Unknown | Registered | Executing | Executed | Failed`

Events indexed by backend indexer:
- `IntentRegistered` (includes ipfsCid for indexer to store)
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

## Storage

### IPFS (primary payload store)
- Full intent JSON pinned before on-chain registration
- CID committed on-chain in `registerIntent`
- Retrievable from chain by anyone: `getIntentCid(intentHash)` → fetch from IPFS

### On-chain (source of truth)
- `intentHash` → state mapping
- `intentHash` → IPFS CID mapping
- `intentHash` → permissionId, agent, expiresAt

### Database (indexed cache — derived, not authoritative)
- `intents` table: intentId, intentHash, ipfsCid, agentId, permissionId, status, chainId, actionType, createdAt, updatedAt
  - Does NOT duplicate full payload — that lives on IPFS
  - Stores enough metadata for dashboard queries and filtering
- `intent_execution_links` table: intentId → txHash / UserOp
- `audit_logs` — add `intent_id` nullable FK column

If the DB is ever lost or out of sync, the full intent history is recoverable by replaying `IntentRegistered` events from the chain and fetching payloads from IPFS.

---

## Backend Services

The backend's role is to:
1. **Coordinate the submission flow** — run policy ceiling check, pin to IPFS, call `IntentRegistry`
2. **Index on-chain state** — poll for `IntentRegistered` / `IntentStateChanged` events, populate DB cache
3. **Reconcile** — compare on-chain execution outcome against IPFS payload
4. **Serve the API** — observability and reporting only

Intent Submission:
- `createIntent(input)` — creates `pending` record, runs policy ceiling check
  - If passes → pins full JSON to IPFS, gets CID → calls `IntentRegistry.registerIntent()`, status → `submitted`
  - If fails → status → `rejected`, violation logged to audit_logs
- `rejectIntent(intentId, reason)` — internal, auto only

Execution:
- `validateIntentForExecution(intentId, request)` — pre-flight simulation (API only, not enforcement)
- `beginIntentExecution(intentId)` — status → `executing` (driven by indexer, not API call)
- `completeIntentExecution(intentId, result)` — status → `executed`
- `failIntentExecution(intentId, error)` — status → `failed`

Reconciliation:
- `reconcileIntent(intentId, executionArtifacts)` — fetches full payload from IPFS, compares against indexed on-chain events, status → `reconciled`

---

## API Endpoints (observability + reporting)

- `POST /api/v1/intents` — submit intent (policy check → IPFS pin → on-chain registration)
- `POST /api/v1/intents/{id}/execute` — return intentHash for UserOp calldata construction (validates state only)
- `GET /api/v1/intents/{id}` — get intent status + reconciliation summary
- `GET /api/v1/intents` — list intents (filter by agentId, status, date range)
- `GET /api/v1/intents/{id}/payload` — fetch full intent payload from IPFS via CID
- `POST /api/v1/validate` — pre-flight simulation; accepts optional `intentId` for richer results

The API cannot create or modify on-chain state except through the submission flow above. Enforcement lives in the contract.

---

## Enforcement (CRITICAL)

ALL execution must include a valid `intentHash` in the UserOperation calldata.

Enforced in `AgentSmartAccount.validateUserOp()` — NOT middleware, NOT API.

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

Policy constraint check still runs in `PermissionEnforcer` as a separate responsibility.

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

Reconciliation fetches the full intent payload from IPFS (via on-chain CID) rather than trusting the DB record.

---

## Audit Log

Extend existing `audit_logs` table:
- Add `intent_id` (UUID, nullable FK → intents)

New event_type values (added to existing set):
- `intent.created`
- `intent.submitted` (includes ipfsCid)
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
- ipfsCid

---

## On-Chain Indexer Changes

Add to existing indexer (`backend/internal/blockchain/indexer.go`):
- Poll `IntentRegistry` for `IntentRegistered` and `IntentStateChanged` events
- On `IntentRegistered`: store intentHash, ipfsCid, permissionId, agent in DB cache; write to `audit_logs` with `source='onchain'`, `intent_id`, `tx_hash`, `block_number`
- On `IntentStateChanged`: update DB status; trigger reconciliation if state = `Executed`

---

## Code Structure

```
backend/internal/intent/
  model/       — IntentRecord, IntentStatus, IntentConstraints
  hash/        — buildCanonicalIntentPayload, hashIntentPayload
  ipfs/        — pin(payload) → CID, fetch(CID) → payload
  service/     — createIntent, submitIntent, beginExecution, completeExecution, reconcile
  policy/      — policy ceiling check (compares intent.constraints vs active policy)
  reconcile/   — reconciliation logic per action type (fetches payload from IPFS)
  audit/       — appendAuditEvent (writes to audit_logs with intent_id)

contracts/src/
  IntentRegistry.sol    — new (stores intentHash → state + CID)
  AgentSmartAccount.sol — updated (intent gating in validateUserOp)
```

---

## Required Flows

Swap:
- `POST /api/v1/intents` → policy check → IPFS pin → on-chain registration → intentHash returned
- Agent builds UserOp with intentHash in calldata
- `validateUserOp`: intent check (IntentRegistry) → permission check (PermissionEnforcer) → execute
- Indexer picks up `Executed` event → fetches payload from IPFS → reconcile

NFT Buy:
- Same flow; reconciliation verifies contract address + price ≤ maxPrice

Contract Call:
- Same flow; reconciliation verifies contract in allowedContracts + value within limits

---

## Open Questions (to resolve before implementation)

1. **Who calls `IntentRegistry.registerIntent`?**
   Options: (a) backend relayer using `DEPLOYER_PRIVATE_KEY`, or (b) agent wallet sends the tx directly.
   Leaning toward: relayer, for consistency with existing deploy pattern.

2. **IPFS pinning provider**
   Options: Pinata, web3.storage, nft.storage, or self-hosted. Backend pins on behalf of agent. Agent can independently verify via CID.

3. **callData encoding for intentHash**
   Where exactly does intentHash live in the UserOperation? Proposal: first 32 bytes prefixed with a 4-byte magic selector. `validateUserOp` extracts it before routing to execution calldata.

4. **PermissionEnforcer awareness of intents**
   Current leaning: `AgentSmartAccount` handles intent gating entirely; `PermissionEnforcer` stays focused on policy constraints only. Should `PermissionEnforcer` receive intentHash as a param for event emission, or remain unaware?

---

## Acceptance Criteria

- Execution fails without a valid intentHash in calldata
- Full intent payload is pinned to IPFS before on-chain registration
- IPFS CID is committed on-chain and recoverable via `getIntentCid`
- Intents persist in DB as indexed cache (metadata + CID, not full payload)
- Intent hash is deterministic and tied to permissionId
- IntentRegistry rejects intents for agents without active permissions
- Execution enforces intent constraints (bounded by policy)
- Execution links to intent via executionRefs
- Reconciliation fetches payload from IPFS, not DB
- Audit logs capture complete intent lifecycle with tx_hash where applicable

---

## Optional (after core)

- Human-readable intent summaries
- Exportable intent reports (API)
- Reusable session intents
- Solver marketplace integration (ERC-7683)
- Public intent explorer (CIDs on-chain mean anyone can build a reader)

---

## Final Goal

AgentGuardrail becomes:

Intent-enforced execution + verifiable audit system for agents

Every action answers:
- What was intended? (IPFS payload, CID committed on-chain)
- Who authorized it? (ERC-8004 permissionId)
- What happened? (on-chain execution + indexer)
- Did it match? (reconciliation against IPFS payload)
