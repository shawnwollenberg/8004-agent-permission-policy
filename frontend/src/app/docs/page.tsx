'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  Bot,
  FileCheck,
  Key,
  Activity,
  Code,
  Terminal,
  BookOpen,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Guardrail</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-muted-foreground hover:text-foreground">
              About
            </Link>
            <Link href="/docs" className="text-foreground font-medium">
              Docs
            </Link>
            <Link href="/">
              <Button>Launch App</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Documentation</h1>
            <p className="text-xl text-muted-foreground">
              Learn how to use Guardrail to manage permissions for your AI agents.
            </p>
          </div>

          <Tabs defaultValue="quickstart" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
              <TabsTrigger value="api">API Reference</TabsTrigger>
              <TabsTrigger value="integration">Integration</TabsTrigger>
            </TabsList>

            <TabsContent value="quickstart" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Getting Started
                  </CardTitle>
                  <CardDescription>
                    Set up Guardrail in 5 minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Connect Your Wallet</h3>
                        <p className="text-muted-foreground text-sm">
                          Click "Connect Wallet" and select your preferred wallet (MetaMask, WalletConnect, etc.).
                          Then sign a message to authenticate securely using Sign-In with Ethereum (SIWE).
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Register an Agent</h3>
                        <p className="text-muted-foreground text-sm">
                          Go to the Agents page and click "Register Agent". Choose a wallet type:
                          <strong> External Wallet</strong> for advisory monitoring, or <strong>Guardrail Secure Account</strong> (recommended)
                          for guaranteed on-chain enforcement. Give your agent a name and description.
                          Secure Account agents get a deployed account where unauthorized transactions cannot execute.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Create a Policy</h3>
                        <p className="text-muted-foreground text-sm">
                          Navigate to Policies and click "Create Policy". Define what actions are allowed
                          (swap, transfer, etc.), set constraints like maximum transaction value and daily limits,
                          then activate the policy.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Grant Permission</h3>
                        <p className="text-muted-foreground text-sm">
                          Go to Permissions and click "Grant Permission". Select your agent and the policy
                          you want to assign. This links the agent to the policy, allowing it to perform
                          actions within the defined constraints.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        5
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Integrate & Validate</h3>
                        <p className="text-muted-foreground text-sm">
                          Use the validation API in your agent's code. Before executing any action,
                          call the validate endpoint to check if the action is allowed. Create an API key
                          in Settings for programmatic access.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="concepts" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <Bot className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Agents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      Agents represent your AI systems that need to perform on-chain actions.
                      Each agent operates in one of two enforcement tiers: Advisory (external wallet with off-chain monitoring)
                      or Enforced (Guardrail Secure Account with on-chain policy gating).
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Advisory mode: monitoring + alerts via API
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Enforced mode: Secure Account blocks unauthorized transactions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        One-way upgrade from advisory to enforced
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <FileCheck className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Policies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      Policies define the rules for what actions an agent can perform.
                      They specify allowed actions, assets, constraints, and time-based validity.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Action allowlists (swap, transfer, etc.)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Value and volume constraints
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Time-based validity windows
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Key className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      Permissions link agents to policies. When you grant a permission,
                      you're authorizing an agent to act according to a specific policy's rules.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Connect agents to policies
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Set expiration dates
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Mint on-chain for enforcement
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Activity className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Audit Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-4">
                      Every action in the system is logged for compliance and debugging.
                      View validation requests, policy changes, and permission grants.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Complete action history
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Filter by event type
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Export to JSON/CSV
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="api" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Validation API
                  </CardTitle>
                  <CardDescription>
                    The core endpoint for checking if an action is allowed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <code className="text-sm">POST /api/v1/validate</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Call this endpoint before your agent executes any action. It returns whether
                    the action is allowed and the applicable constraints.
                  </p>
                  <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">{`// Request
{
  "agent_id": "your-agent-uuid",
  "action": {
    "type": "swap",
    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "amount": "1000",
    "protocol": "uniswap-v3"
  }
}

// Response (allowed — advisory agent)
{
  "allowed": true,
  "permission_id": "...",
  "policy_id": "...",
  "constraints": {
    "maxValuePerTx": "5000",
    "maxDailyVolume": "50000"
  },
  "enforcement_level": "advisory",
  "wallet_type": "eoa",
  "onchain_enforced": false,
  "request_id": "..."
}

// Response (allowed — enforced Secure Account agent)
{
  "allowed": true,
  "permission_id": "...",
  "policy_id": "...",
  "constraints": { ... },
  "enforcement_level": "enforced",
  "wallet_type": "smart_account",
  "onchain_enforced": true,
  "request_id": "..."
}

// Response (denied)
{
  "allowed": false,
  "reason": "exceeds maximum transaction value",
  "request_id": "..."
}`}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    Two methods for API authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">API Key (Recommended for agents)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Create an API key in Settings and include it in your requests.
                    </p>
                    <div className="bg-muted rounded-lg p-4">
                      <code className="text-sm">X-API-Key: YOUR_API_KEY</code>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">JWT Token (For dashboard/UI)</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Obtained after SIWE authentication, used for browser sessions.
                    </p>
                    <div className="bg-muted rounded-lg p-4">
                      <code className="text-sm">Authorization: Bearer your_jwt_token</code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Other Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b">
                      <code>POST /api/v1/validate/simulate</code>
                      <span className="text-muted-foreground">Simulate without recording</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <code>POST /api/v1/validate/batch</code>
                      <span className="text-muted-foreground">Validate multiple actions</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <code>GET /api/v1/agents</code>
                      <span className="text-muted-foreground">List your agents</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <code>POST /api/v1/agents/:id/deploy-smart-account</code>
                      <span className="text-muted-foreground">Deploy Guardrail Secure Account</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <code>POST /api/v1/agents/:id/upgrade-to-smart-account</code>
                      <span className="text-muted-foreground">Upgrade to Guardrail Secure Account</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <code>GET /api/v1/policies</code>
                      <span className="text-muted-foreground">List your policies</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <code>GET /api/v1/permissions</code>
                      <span className="text-muted-foreground">List permissions</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <code>GET /api/v1/audit</code>
                      <span className="text-muted-foreground">Query audit logs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Python Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">{`import requests

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
        # Secure Account agents have on-chain enforcement too
        if result.get("onchain_enforced"):
            print("On-chain enforced via Guardrail Secure Account")
        return True
    else:
        print(f"Action denied: {result['reason']}")
        return False

# Example usage
if validate_action("your-agent-uuid", {
    "type": "swap",
    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "amount": "1000",
    "protocol": "uniswap-v3"
}):
    # Execute the swap
    execute_swap(...)`}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    JavaScript/TypeScript Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm">{`const API_URL = "https://your-backend.railway.app";
const API_KEY = "YOUR_API_KEY";

async function validateAction(agentId: string, action: object): Promise<boolean> {
  const response = await fetch(\`\${API_URL}/api/v1/validate\`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({ agent_id: agentId, action }),
  });

  const result = await response.json();

  if (result.allowed) {
    console.log("Action allowed. Constraints:", result.constraints);
    if (result.onchain_enforced) {
      console.log("On-chain enforced via Guardrail Secure Account");
    }
    return true;
  } else {
    console.log("Action denied:", result.reason);
    return false;
  }
}

// Example usage
const allowed = await validateAction("your-agent-uuid", {
  type: "swap",
  token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  amount: "1000",
  protocol: "uniswap-v3",
});

if (allowed) {
  // Execute the swap
  await executeSwap(...);
}`}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Best Practices</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex gap-3">
                      <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Always validate before executing</p>
                        <p className="text-sm text-muted-foreground">
                          Call the validate endpoint before every on-chain action to ensure compliance.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Use simulation for testing</p>
                        <p className="text-sm text-muted-foreground">
                          The /simulate endpoint lets you test without affecting usage quotas.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Set up webhooks for alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Configure webhooks to get notified of policy violations or permission expiry.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Review audit logs regularly</p>
                        <p className="text-sm text-muted-foreground">
                          Monitor the audit log to track agent behavior and identify issues.
                        </p>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Upgrade to enforced mode for high-value agents</p>
                        <p className="text-sm text-muted-foreground">
                          Start with advisory mode to test your policies, then upgrade to a Guardrail Secure Account
                          for guaranteed on-chain enforcement. Once assets are in a Secure Account, unauthorized
                          transactions cannot execute. This is a one-way upgrade for security.
                        </p>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>Guardrail - Built on ERC-8004 Standard</p>
        </div>
      </footer>
    </div>
  )
}
