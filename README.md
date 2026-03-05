# Guardrail

Permission, policy, and audit layer for AI agents. Safely authorize what your agents can do on-chain.

Built on the ERC-8004 standard with ERC-4337 smart account enforcement.

## Architecture

```
erc8004-policy-saas/
├── backend/          # Go backend with Chi router
├── contracts/        # Solidity contracts (Foundry)
└── frontend/         # Next.js 15 dashboard
```

### Smart Account Enforcement

Every agent gets a Guardrail Secure Account — an ERC-4337 smart account where `validateUserOp` calls the `PermissionEnforcer` contract. Unauthorized transactions revert before execution at the protocol level.

There is no advisory/EOA mode. All agents are enforced smart accounts.

### Bot Signer Options

When creating an agent, users choose the signer:
- **Connected Wallet** — Use the connected MetaMask wallet as the signer (default)
- **Generate Bot Signer** — Generate a fresh keypair client-side for bots that need a raw private key. The private key is shown once after deployment and never stored.

### On-Chain Event Indexer

The backend includes an event indexer (`backend/internal/blockchain/indexer.go`) that polls the chain every 12 seconds for:
- `EnforcementResult` — allowed or blocked transactions
- `ConstraintViolation` — policy constraint violations
- `UsageRecorded` — usage tracking events
- `Executed` — smart account executions
- `AccountCreated` — new account deployments

Events are written to `audit_logs` with `source='onchain'`, `tx_hash`, and `block_number`. The indexer tracks its position in the `indexer_state` table. It no-ops in simulated mode (no `DEPLOYER_PRIVATE_KEY`).

## Quick Start

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- Foundry (for contracts)

### Development

1. Start the local environment:

```bash
docker-compose up -d
```

2. Run database migrations:

```bash
cd backend
migrate -path internal/database/migrations -database "postgres://postgres:postgres@localhost:5432/erc8004?sslmode=disable" up
```

3. Start the backend:

```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

4. Start the frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

5. Open http://localhost:3000

## API Endpoints

### Auth
- `POST /api/v1/auth/nonce` - Get nonce for SIWE
- `POST /api/v1/auth/verify` - Verify signature and get JWT

### Agents
- `POST /api/v1/agents` - Register agent (smart account, always enforced — no `wallet_type` field needed)
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents/sync` - Sync agents from on-chain registry
- `GET /api/v1/agents/{id}` - Get agent
- `PATCH /api/v1/agents/{id}` - Update agent
- `DELETE /api/v1/agents/{id}` - Delete agent
- `POST /api/v1/agents/{id}/register-onchain` - Register on ERC-8004 IdentityRegistry
- `POST /api/v1/agents/{id}/deploy-smart-account` - Deploy ERC-4337 smart account (optional `signer_type`: `wallet` or `generated`)
- `GET /api/v1/agents/{id}/smart-account` - Get smart account details

### Policies
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies/{id}/activate` - Activate policy
- `POST /api/v1/policies/{id}/revoke` - Revoke policy

### Permissions
- `POST /api/v1/permissions` - Grant permission
- `POST /api/v1/permissions/{id}/mint` - Mint on-chain

### Validation (Pre-flight)
- `POST /api/v1/validate` - Pre-flight action check (always returns `enforcement_level: "enforced"`, `wallet_type: "smart_account"`, `onchain_enforced: true`)
- `POST /api/v1/validate/batch` - Batch validation
- `POST /api/v1/validate/simulate` - Simulate without recording

### Audit
- `GET /api/v1/audit` - List audit logs (supports `source=onchain|offchain` filter, returns `tx_hash` and `block_number` for on-chain events)
- `GET /api/v1/audit/export` - Export audit logs (JSON or CSV)

## Smart Contracts

Deployed on Sepolia:
- `IdentityRegistry` - Agent identity management
- `PolicyRegistry` - On-chain policy storage
- `PermissionEnforcer` - Action validation with protocol and chain constraints. Emits `EnforcementResult`, `ConstraintViolation`, `UsageRecorded`.
- `AgentAccountFactory` - CREATE2 factory for deterministic smart account deployment. Emits `AccountCreated`.
- `AgentSmartAccount` - ERC-4337 account that enforces permissions in `validateUserOp`. Emits `Executed`.

### Build & Test

```bash
cd contracts
forge build
forge test -vvv
```

### Deploy

```bash
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast
```

## Policy Example

```json
{
  "actions": ["swap", "transfer"],
  "assets": {
    "tokens": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    "protocols": ["uniswap-v3"],
    "chains": [1, 11155111]
  },
  "constraints": {
    "maxValuePerTx": "5000",
    "maxDailyVolume": "50000"
  },
  "duration": {
    "validFrom": "2024-01-01T00:00:00Z",
    "validUntil": "2024-12-31T23:59:59Z"
  }
}
```

## License

MIT
