# ERC-8004 Policy SaaS

Permission, policy, and audit layer for AI agents. "AWS IAM + CloudTrail for autonomous crypto agents."

## Architecture

```
erc8004-policy-saas/
├── backend/          # Go backend with Chi router
├── contracts/        # Solidity contracts (Foundry)
└── frontend/         # Next.js 15 dashboard
```

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
- `POST /api/v1/agents` - Register agent
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents/{id}/register-onchain` - Register on ERC-8004

### Policies
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies/{id}/activate` - Activate policy
- `POST /api/v1/policies/{id}/revoke` - Revoke policy

### Permissions
- `POST /api/v1/permissions` - Grant permission
- `POST /api/v1/permissions/{id}/mint` - Mint on-chain

### Validation (Core Product)
- `POST /api/v1/validate` - Validate an action
- `POST /api/v1/validate/batch` - Batch validation
- `POST /api/v1/validate/simulate` - Simulate without recording

## Smart Contracts

Deployed on Sepolia:
- `IdentityRegistry` - Agent identity management
- `PolicyRegistry` - On-chain policy storage
- `PermissionEnforcer` - Action validation

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
    "protocols": ["uniswap-v3"]
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
