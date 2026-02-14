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
   IDENTITY_REGISTRY_ADDRESS=0x...
   POLICY_REGISTRY_ADDRESS=0x...
   PERMISSION_ENFORCER_ADDRESS=0x...
   SMART_ACCOUNT_FACTORY_ADDRESS=0x...
   ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
   ```
   Note: `DATABASE_URL` is automatically set when you add a PostgreSQL database.
   The `SMART_ACCOUNT_FACTORY_ADDRESS` and `PERMISSION_ENFORCER_ADDRESS` are required for ERC-4337 smart account enforcement. Without them, agents default to advisory (EOA) mode.

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
   PERMISSION_ENFORCER_ADDRESS=0x...
   SMART_ACCOUNT_FACTORY_ADDRESS=0x...
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
3. Choose a wallet type:
   - **EOA Wallet** — Advisory mode (monitoring + alerts only)
   - **Smart Account** (Recommended) — Enforced mode (policies enforced on-chain)
4. For **Smart Account**, choose a signer source:
   - **Connected Wallet** — Your MetaMask wallet signs transactions (default)
   - **Generate Bot Signer** — Generate a dedicated keypair for your bot:
     1. Click **Generate Key** to create a fresh keypair client-side
     2. The generated address appears as the signer
     3. After registration and deployment, a dialog shows the private key **one time**
     4. Copy or download the `.env` file — the key is never stored and cannot be recovered
5. Fill in:
   - Name: "My Trading Bot"
   - Description: "Automated DeFi trader"
6. Click **Register Agent**

For smart account agents, a new ERC-4337 smart account is deployed and policies are enforced on-chain — transactions violating policy revert before execution.

Agents with generated bot signers show a "Generated" badge and expandable "Bot Connection Details" on their card (smart account address, signer address, EntryPoint, chain ID).

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
#   "request_id": "...",
#   "enforcement_level": "advisory",
#   "wallet_type": "eoa",
#   "onchain_enforced": false
# }
#
# For smart account agents, onchain_enforced will be true and
# enforcement_level will be "enforced".

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
   - `agent.smart_account_deployed` (if you created a smart account agent; includes `signer_type`)
   - `agent.upgraded_to_smart_account` (if you upgraded an EOA agent)

### 8. Create a Bot Signer Agent (Optional)

1. Navigate to **Agents** page
2. Click **Register Agent**
3. Select **Secure Account** as wallet type
4. Under **Signer Source**, select **Generate Bot Signer**
5. Click **Generate Key** — a new address appears
6. Fill in agent name and click **Register Agent**
7. After deployment completes, the **Private Key Reveal Dialog** appears:
   - Click the eye icon to reveal the full private key
   - Click **Download .env file** to save connection details
   - Click **I've Saved the Key** to close (this clears the key from memory)
8. The agent card now shows:
   - A "Generated" badge next to the signer address
   - An expandable "Bot Connection Details" section with all addresses your bot needs
9. Give the downloaded `.env` file to your bot for programmatic signing

### 9. Upgrade an EOA Agent to Smart Account (Optional)

1. Navigate to **Agents** page
2. Find an EOA agent (shown with amber "Advisory" badge)
3. Click the menu (&#8942;) and select **Upgrade to Enforced Smart Account**
4. Review the upgrade details — this is a one-way operation:
   - The existing EOA becomes the signer for the new smart account
   - All policies will be enforced on-chain going forward
   - You cannot downgrade back to advisory mode
5. Click **Confirm Upgrade**
6. The agent card should now show a green "Enforced" badge

### 10. Test Webhooks (Optional)

1. Go to **Settings** → **Webhooks**
2. Create a webhook pointing to https://webhook.site (free testing service)
3. Perform actions (create agent, validate, etc.)
4. Check webhook.site for received events

### 11. Create API Key for Programmatic Access

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
        # For smart account agents, enforcement is also on-chain
        if result.get("onchain_enforced"):
            print("Note: This action is also enforced on-chain via smart account")
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

For **smart account agents**, even if the off-chain check passes, the on-chain `PermissionEnforcer` will independently validate the action during `validateUserOp`. This provides defense-in-depth: advisory agents rely on the SDK calling this API, while enforced agents have a second on-chain check that cannot be bypassed.

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
- The backend retries database connections 5 times with backoff on startup

### CORS errors / 502 Bad Gateway on Railway
- A 502 means the backend process is down. Railway's reverse proxy returns 502 without CORS headers, so browsers report it as a CORS error.
- Check Railway deployment logs for database connection failures
- Verify `DATABASE_URL` is set and the PostgreSQL instance is running
- Verify `CORS_ORIGIN` includes your frontend URL (supports comma-separated values)
- The backend now includes connection retry logic to handle Railway cold starts

### Frontend auth fails
- Ensure CORS_ORIGIN in backend matches your frontend URL (e.g. `https://your-app.vercel.app`)
- Check browser console for errors
- Make sure JWT_SECRET is set

### Validation always fails
- Verify the agent exists and is active
- Verify the policy is activated (not draft)
- Verify a permission links the agent to the policy
- Check the action type matches the policy's allowed actions

### Smart account deployment fails
- Verify `SMART_ACCOUNT_FACTORY_ADDRESS` and `ENTRY_POINT_ADDRESS` are set in env vars
- Check the agent is active and doesn't already have a smart account
- Ensure the factory contract is deployed on the configured chain

### Contract deployment fails
- Ensure you have testnet ETH
- Check RPC URL is correct
- Verify private key has funds
