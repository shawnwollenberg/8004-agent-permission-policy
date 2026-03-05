# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Permission & Policy SaaS (ERC-8004 Native) - A permission, policy, and audit layer for AI agents that lets users safely authorize what agents can do on-chain. Think "AWS IAM + CloudTrail for autonomous crypto agents."

**Status:** Functional MVP with backend, frontend, and smart contracts deployed on Sepolia.

## Technology Stack

- **Backend:** Go 1.22, Chi router, pgx (PostgreSQL driver), zerolog
- **Database:** PostgreSQL (policies, logs, smart accounts)
- **Blockchain:** EVM (Ethereum Virtual Machine), ERC-4337 Account Abstraction
- **Contracts:** Solidity 0.8.24 (Foundry) — ERC-8004 + ERC-4337 smart accounts
- **Frontend:** Next.js 15, React 18, Wagmi, RainbowKit, Tailwind CSS
- **Authentication:** SIWE (Sign-In with Ethereum) + JWT + API keys
- **Infrastructure:** Railway (backend) + Vercel (frontend) + Sepolia (contracts)

## Core Architecture

Six main components:

1. **Policy Engine** (`backend/internal/domain/policy/`) - Defines who (agent), what (actions), which assets (tokens, protocols, chains), constraints (value limits, daily volume, tx count), and duration. Policies compile into ERC-8004 permissions.

2. **ERC-8004 Authorization Issuer** - Mints/registers permission objects linking wallet, agent, and policy. Handles expiry, revocation, rotation.

3. **Enforcement & Validation Layer** - Single enforced tier (smart accounts only):
   - **Pre-flight validation API:** Off-chain `POST /api/v1/validate` runs policy simulation for dashboards and SDK use.
   - **On-chain enforcement (ERC-4337 Smart Account):** `AgentSmartAccount.validateUserOp()` calls `PermissionEnforcer` — violating transactions revert before execution.
   - All agents use smart accounts. EOA/advisory mode has been removed.

4. **Smart Account System** (`contracts/src/AgentSmartAccount.sol`, `AgentAccountFactory.sol`) - ERC-4337 compatible accounts with CREATE2 deterministic deployment.

5. **On-Chain Event Indexer** (`backend/internal/blockchain/indexer.go`) - Polls the chain every 12 seconds for `EnforcementResult`, `ConstraintViolation`, `UsageRecorded`, `Executed`, and `AccountCreated` events. Writes them to `audit_logs` with `source='onchain'`, `tx_hash`, and `block_number`. Tracks position in `indexer_state` table. No-ops in simulated mode.

6. **Audit & Activity Log** (`backend/internal/domain/audit/`) - Immutable policy history, execution trails, revocation events, enforcement events, smart account deployments. Each log entry has a `source` field (`'offchain'` or `'onchain'`), and optional `tx_hash` / `block_number` for on-chain events.

7. **Dashboard & API** (`frontend/`, `backend/internal/api/`) - Human UI for permission management with smart-account-only agent creation (connected wallet or generated bot signer), enforce badge always shown, audit log with on-chain event badges and Etherscan tx links. Machine API for real-time pre-flight validation.

## Database Schema

Key tables: `wallets`, `agents` (always `wallet_type='smart_account'`, `enforcement_level='enforced'`), `smart_accounts` (with `signer_type`: `'wallet'` or `'generated'`), `policies`, `permissions`, `validation_requests`, `enforcement_events`, `audit_logs` (with `source`, `tx_hash`, `block_number`), `webhooks`, `api_keys`, `indexer_state`.

Migrations in `backend/internal/database/migrations/`:
- `000001_init` — Core tables
- `000002_smart_accounts` — Smart account support, enforcement events, wallet_type/enforcement_level columns
- `000003_signer_type` — Adds `signer_type` column to `smart_accounts` for bot-generated signers
- `000004_smart_account_only` — Removes EOA/advisory support, adds on-chain audit fields, adds `indexer_state` table

## Development Commands

```bash
# Go backend
cd backend
go build ./...
go test ./...
go vet ./...
go run ./cmd/server

# Solidity contracts (using Foundry)
cd contracts
forge build
forge test
forge test -vvv  # verbose

# Frontend
cd frontend
npm install
npm run dev
npm run build
```

## API Endpoints

### Agents
- `POST /api/v1/agents` — Create agent (smart account only, no wallet_type field)
- `GET /api/v1/agents` — List agents
- `POST /api/v1/agents/sync` — Sync on-chain agents
- `GET /api/v1/agents/{id}` — Get agent
- `PATCH /api/v1/agents/{id}` — Update agent
- `DELETE /api/v1/agents/{id}` — Delete agent
- `POST /api/v1/agents/{id}/register-onchain` — Register in IdentityRegistry
- `POST /api/v1/agents/{id}/deploy-smart-account` — Deploy ERC-4337 account
- `GET /api/v1/agents/{id}/smart-account` — Get smart account info

> Note: `POST /api/v1/agents/{id}/upgrade-to-smart-account` has been removed. All agents are smart accounts.

### Audit
- `GET /api/v1/audit` — List audit logs (supports `source=onchain|offchain` filter)
- `GET /api/v1/audit/export` — Export audit logs (JSON or CSV, includes source/tx_hash/block_number)

### Validation
- `POST /api/v1/validate` — Pre-flight policy check (always returns `enforcement_level: "enforced"`, `wallet_type: "smart_account"`, `onchain_enforced: true`)
- `POST /api/v1/validate/batch` — Batch validate
- `POST /api/v1/validate/simulate` — Simulate action

## Smart Contract Architecture

- **IdentityRegistry** — ERC-8004 agent identity registration
- **PolicyRegistry** — On-chain policy and permission storage
- **PermissionEnforcer** — Action validation with constraints (value, volume, tx count, actions, tokens, protocols, chains). Emits `EnforcementResult`, `ConstraintViolation`, `UsageRecorded` events indexed by the backend.
- **AgentSmartAccount** — ERC-4337 IAccount implementation. `validateUserOp` verifies ECDSA signature and enforces permissions via `PermissionEnforcer`. Emits `Executed` event.
- **AgentAccountFactory** — CREATE2 factory for deterministic smart account deployment. Emits `AccountCreated` event.

EntryPoint v0.6 canonical address: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`

## Key Design Decisions

- **Smart accounts only** — All agents use ERC-4337 smart accounts with enforced on-chain policy enforcement. No EOA/advisory tier.
- Off-chain validation runs as a pre-flight simulation (needed for dashboards, SDK use, simulation)
- On-chain indexer polls every 12 seconds; in simulated mode (no DEPLOYER_PRIVATE_KEY) it no-ops silently
- Custom smart account (not Safe/ZeroDev module) — `validateUserOp` must call our `PermissionEnforcer` directly
- Backend-initiated on-chain sync — when policies change, backend pushes constraints to chain
- Backward-compatible `actionData` encoding — PermissionEnforcer supports both old (64-byte: value, token) and new (128-byte: value, token, protocol, chainId) formats
- Database connection retries on startup (5 attempts with backoff) to handle Railway cold starts
- Bot signer generation — client-side keypair generation via viem for bots that need raw private keys. Private key shown once after smart account deployment, never stored. `signer_type` column distinguishes `'wallet'` (connected wallet) from `'generated'` (bot keypair)

## Environment Variables (Backend)

```
PORT, ENVIRONMENT, CORS_ORIGIN, DATABASE_URL, JWT_SECRET,
RPC_URL, CHAIN_ID, IDENTITY_REGISTRY_ADDRESS, POLICY_REGISTRY_ADDRESS,
PERMISSION_ENFORCER_ADDRESS, SMART_ACCOUNT_FACTORY_ADDRESS, ENTRY_POINT_ADDRESS
```
