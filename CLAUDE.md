# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Permission & Policy SaaS (ERC-8004 Native) - A permission, policy, and audit layer for AI agents that lets users safely authorize what agents can do on-chain. Think "AWS IAM + CloudTrail for autonomous crypto agents."

**Status:** Early-stage/greenfield project. Only product_description.md exists currently.

## Planned Technology Stack

- **Backend:** Go
- **Database:** PostgreSQL (policies, logs)
- **Blockchain:** EVM (Ethereum Virtual Machine)
- **Contracts:** Solidity (ERC-8004 reference implementation)
- **Authentication:** Wallet + API keys
- **SDKs:** JavaScript and Python
- **Infrastructure:** ECS/Railway (early) → EKS (later)

## Core Architecture

Five main components:

1. **Policy Engine** - Defines who (agent), what (actions), which assets, constraints, and duration. Policies compile into ERC-8004 permissions.

2. **ERC-8004 Authorization Issuer** - Mints/registers permission objects linking wallet, agent, and policy. Handles expiry, revocation, rotation.

3. **Enforcement & Validation Layer** - Two modes:
   - On-chain: Contracts verify ERC-8004 permissions before execution
   - Off-chain: Agent frameworks call API to validate intent, simulate constraints, log decisions (bigger early market)

4. **Audit & Activity Log** - Immutable policy history, execution trails, revocation events, violations.

5. **Dashboard & API** - Human UI for permission management, machine API for real-time validation, webhooks for violations/expiry.

## Development Commands (once project is initialized)

```bash
# Go backend
go mod init github.com/yourorg/erc8004-saas
go build ./...
go test ./...
go run ./cmd/server

# Solidity contracts (using Foundry)
forge build
forge test

# SDKs
cd sdks/js && npm install && npm run build
cd sdks/python && pip install -e .
```

## Key Design Decisions

- Off-chain validation is the early go-to-market strategy; on-chain enforcement comes later
- Standards compliance (ERC-8004) is the moat
- Policy examples: "Agent A can trade ETH/USDC up to $5k/day", "Agent B can rebalance LP positions weekly"
