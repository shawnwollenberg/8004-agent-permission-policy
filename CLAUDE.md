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

3. **Enforcement & Validation Layer** - Two tiers:
   - **Advisory (EOA):** Off-chain validation API logs and alerts, but cannot prevent on-chain execution
   - **Enforced (ERC-4337 Smart Account):** `AgentSmartAccount.validateUserOp()` calls `PermissionEnforcer` — violating transactions revert before execution. Off-chain validation still runs for dashboards and simulation.

4. **Smart Account System** (`contracts/src/AgentSmartAccount.sol`, `AgentAccountFactory.sol`) - ERC-4337 compatible accounts with CREATE2 deterministic deployment. Upgrade from EOA to smart account is one-way.

5. **Audit & Activity Log** (`backend/internal/domain/audit/`) - Immutable policy history, execution trails, revocation events, enforcement events, smart account deployments.

6. **Dashboard & API** (`frontend/`, `backend/internal/api/`) - Human UI for permission management with wallet type selection (EOA vs Smart Account), enforcement badges, and upgrade flow. Machine API for real-time validation with enforcement context.

## Database Schema

Key tables: `wallets`, `agents` (with `wallet_type` and `enforcement_level`), `smart_accounts`, `policies`, `permissions`, `validation_requests`, `enforcement_events`, `audit_logs`, `webhooks`, `api_keys`.

Migrations in `backend/internal/database/migrations/`:
- `000001_init` — Core tables
- `000002_smart_accounts` — Smart account support, enforcement events, wallet_type/enforcement_level columns

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

## Smart Contract Architecture

- **IdentityRegistry** — ERC-8004 agent identity registration
- **PolicyRegistry** — On-chain policy and permission storage
- **PermissionEnforcer** — Action validation with constraints (value, volume, tx count, actions, tokens, protocols, chains). Supports legacy (64-byte) and extended (128-byte) `actionData` encoding.
- **AgentSmartAccount** — ERC-4337 IAccount implementation. `validateUserOp` verifies ECDSA signature and enforces permissions via `PermissionEnforcer`.
- **AgentAccountFactory** — CREATE2 factory for deterministic smart account deployment. Idempotent (returns existing account if already deployed).

EntryPoint v0.6 canonical address: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`

## Key Design Decisions

- Two enforcement tiers: Advisory (EOA) and Enforced (ERC-4337 Smart Account)
- Off-chain validation runs for BOTH tiers (needed for dashboards, simulation, pre-flight checks)
- Upgrade from EOA to smart account is one-way (no downgrade)
- Custom smart account (not Safe/ZeroDev module) — `validateUserOp` must call our `PermissionEnforcer` directly
- Backend-initiated on-chain sync — when policies change, backend pushes constraints to chain
- Backward-compatible `actionData` encoding — PermissionEnforcer supports both old (64-byte: value, token) and new (128-byte: value, token, protocol, chainId) formats
- Database connection retries on startup (5 attempts with backoff) to handle Railway cold starts

## Environment Variables (Backend)

```
PORT, ENVIRONMENT, CORS_ORIGIN, DATABASE_URL, JWT_SECRET,
RPC_URL, CHAIN_ID, IDENTITY_REGISTRY_ADDRESS, POLICY_REGISTRY_ADDRESS,
PERMISSION_ENFORCER_ADDRESS, SMART_ACCOUNT_FACTORY_ADDRESS, ENTRY_POINT_ADDRESS
```
