# Guardrail - Deployment & Testing Guide

## Table of Contents
1. [Local Development](#local-development)
2. [Production Deployment](#production-deployment)
3. [Testing the System](#testing-the-system)

---

## Local Development

### Prerequisites
- Go 1.22+
- Node.js 20+
- Docker & Docker Compose
- Foundry (for contracts)
- A wallet (MetaMask recommended)

### Step 1: Start Infrastructure

```bash
# Start PostgreSQL and Anvil (local blockchain)
docker-compose up -d postgres anvil

# Wait for PostgreSQL to be ready
docker-compose logs -f postgres  # Wait until "database system is ready"
```

### Step 2: Run Database Migrations

```bash
# Install migrate CLI if needed
# brew install golang-migrate

# Run migrations
docker-compose run --rm migrate
```

### Step 3: Start the Backend

```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

The backend will be available at `http://localhost:8080`

### Step 4: Start the Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Step 5: Deploy Contracts (Local)

```bash
cd contracts

# Deploy to local Anvil
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Note: The private key above is Anvil's default test account #0.

---

## Production Deployment

### Backend (Railway)

The backend includes Railway configuration files (`railway.toml` and `nixpacks.toml`) that tell Railway how to build and run the Go application.

#### Option A: Deploy via GitHub (Recommended)

1. **Create a Railway account** at https://railway.app

2. **Create a new project** from your GitHub repository:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the `backend` directory

3. **Configure the service:**
   - Go to your service settings
   - Set the **Root Directory** to `backend`
   - Railway will use `railway.toml` and `nixpacks.toml` for build configuration

4. **Add a PostgreSQL database:**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

5. **Set environment variables** in the Variables tab:
   ```
   PORT=8080
   ENVIRONMENT=production
   JWT_SECRET=<generate a secure random string>
   CORS_ORIGIN=https://your-frontend-domain.vercel.app
   RPC_URL=https://sepolia.infura.io/v3/<your-key>
   CHAIN_ID=11155111
   ```
   Note: `DATABASE_URL` is automatically set when you add a PostgreSQL database.

6. **Run migrations** (after first deployment):
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   railway login
   railway link

   # Run migrations
   railway run migrate -path internal/database/migrations -database "$DATABASE_URL" up
   ```

#### Option B: Deploy via CLI

1. **Install and login to Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create project and add database:**
   ```bash
   railway init
   railway add --database postgres
   ```

3. **Link and deploy:**
   ```bash
   cd backend
   railway link
   railway up
   ```

4. **Set environment variables** in Railway dashboard (same as Option A step 5)

5. **Run migrations:**
   ```bash
   railway run migrate -path internal/database/migrations -database "$DATABASE_URL" up
   ```

### Frontend (Vercel)

1. **Create a Vercel account** at https://vercel.com

2. **Import your repository** and select the `frontend` directory as the root

3. **Set environment variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<get from cloud.walletconnect.com>
   ```

4. **Deploy** - Vercel will automatically build and deploy

### Smart Contracts (Sepolia Testnet)

1. **Get testnet ETH** from https://sepoliafaucet.com

2. **Set up environment:**
   ```bash
   cd contracts

   # Create .env file
   echo "PRIVATE_KEY=your_wallet_private_key" > .env
   echo "SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key" >> .env
   echo "ETHERSCAN_API_KEY=your_etherscan_key" >> .env
   ```

3. **Deploy:**
   ```bash
   source .env
   forge script script/Deploy.s.sol \
     --rpc-url $SEPOLIA_RPC_URL \
     --broadcast \
     --verify \
     -vvvv
   ```

4. **Save the deployed addresses** and update your backend `.env`:
   ```
   IDENTITY_REGISTRY_ADDRESS=0x...
   POLICY_REGISTRY_ADDRESS=0x...
   ```

---

## Testing the System

### 1. Connect Your Wallet

1. Open the frontend at `http://localhost:3000` (or your Vercel URL)
2. Click "Connect Wallet" and select MetaMask
3. Approve the connection
4. Click "Sign In with Wallet" to authenticate via SIWE

### 2. Create an Agent

1. Navigate to **Agents** page
2. Click **Register Agent**
3. Fill in:
   - Name: "My Trading Bot"
   - Description: "Automated DeFi trader"
   - Agent Address: (optional) Your bot's wallet address
4. Click **Register Agent**

### 3. Create a Policy

1. Navigate to **Policies** page
2. Click **Create Policy**
3. Fill in:
   - Name: "Trading Policy"
   - Description: "Allows swapping up to $5k per transaction"
   - Actions: "swap, transfer"
   - Max Value Per Tx: "5000"
   - Max Daily Volume: "50000"
4. Click **Create Policy**
5. Click the menu (⋮) on your policy and select **Activate**

### 4. Grant Permission

1. Navigate to **Permissions** page
2. Click **Grant Permission**
3. Select your agent and policy
4. Click **Grant Permission**

### 5. Test Validation API

Use curl or your agent to test the validation endpoint:

```bash
# Get an API key first (from Settings page) or use your JWT token

# Test validation
curl -X POST http://localhost:8080/api/v1/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "action": {
      "type": "swap",
      "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "amount": "1000",
      "protocol": "uniswap-v3"
    }
  }'

# Expected response (if allowed):
# {
#   "allowed": true,
#   "permission_id": "...",
#   "policy_id": "...",
#   "constraints": {"maxValuePerTx": "5000", ...},
#   "request_id": "..."
# }

# Test with amount exceeding limit
curl -X POST http://localhost:8080/api/v1/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "action": {
      "type": "swap",
      "amount": "10000"
    }
  }'

# Expected response (denied):
# {
#   "allowed": false,
#   "reason": "no matching policy found for this action",
#   "request_id": "..."
# }
```

### 6. Test Simulation

```bash
curl -X POST http://localhost:8080/api/v1/validate/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "action": {
      "type": "swap",
      "amount": "3000"
    }
  }'

# Returns current usage and remaining quota
```

### 7. Check Audit Logs

1. Navigate to **Audit** page
2. You should see all your actions logged:
   - `auth.login`
   - `agent.created`
   - `policy.created`
   - `policy.activated`
   - `permission.created`
   - `validation.request`

### 8. Test Webhooks (Optional)

1. Go to **Settings** → **Webhooks**
2. Create a webhook pointing to https://webhook.site (free testing service)
3. Perform actions (create agent, validate, etc.)
4. Check webhook.site for received events

### 9. Create API Key for Programmatic Access

1. Go to **Settings** → **API Keys**
2. Click **Create Key**
3. Copy the key (shown only once!)
4. Use it in requests:

```bash
curl -X POST http://localhost:8080/api/v1/validate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "...", "action": {"type": "swap", "amount": "100"}}'
```

---

## Integration Example

Here's how an AI agent would integrate with the system:

```python
import requests

API_URL = "https://your-backend.railway.app"
API_KEY = "YOUR_API_KEY"

def validate_action(agent_id: str, action: dict) -> bool:
    """Check if an action is allowed before executing it."""
    response = requests.post(
        f"{API_URL}/api/v1/validate",
        headers={"X-API-Key": API_KEY},
        json={"agent_id": agent_id, "action": action}
    )
    result = response.json()

    if result["allowed"]:
        print(f"Action allowed. Constraints: {result['constraints']}")
        return True
    else:
        print(f"Action denied: {result['reason']}")
        return False

# Before executing a swap
if validate_action("agent-uuid", {
    "type": "swap",
    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "amount": "1000",
    "protocol": "uniswap-v3"
}):
    # Execute the swap
    execute_swap(...)
```

---

## Troubleshooting

### Railway deployment fails

**"Error creating build plan with Railpack"**
- Ensure `railway.toml` and `nixpacks.toml` exist in the `backend` directory
- Set the **Root Directory** to `backend` in service settings
- Commit and push both config files to your repository

**Build fails with Go errors**
- Check that `go.mod` and `go.sum` are committed
- Verify Go version in `nixpacks.toml` matches your `go.mod` (Go 1.22)

**Health check fails**
- The backend exposes `/health` endpoint on the configured PORT
- Ensure `PORT` environment variable is set to `8080`
- Check deployment logs: `railway logs`

### Backend won't start (local)
- Check PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL is correct
- Run migrations: `docker-compose run --rm migrate`

### Frontend auth fails
- Ensure CORS_ORIGIN in backend matches your frontend URL
- Check browser console for errors
- Make sure JWT_SECRET is set

### Validation always fails
- Verify the agent exists and is active
- Verify the policy is activated (not draft)
- Verify a permission links the agent to the policy
- Check the action type matches the policy's allowed actions

### Contract deployment fails
- Ensure you have testnet ETH
- Check RPC URL is correct
- Verify private key has funds
