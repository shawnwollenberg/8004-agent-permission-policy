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
  ArrowDownToLine,
  Send,
  Workflow,
  Blocks,
  DollarSign,
  Globe,
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="api">API Reference</TabsTrigger>
              <TabsTrigger value="contracts">Smart Contracts</TabsTrigger>
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
                          Go to the Agents page and click &ldquo;Register Agent&rdquo;. Choose <strong>Guardrail Secure Account</strong> (recommended)
                          for guaranteed on-chain enforcement. Then choose a signer source:
                          <strong> Connected Wallet</strong> to use your MetaMask wallet, or <strong>Generate Bot Signer</strong> to
                          create a dedicated keypair for your bot. The generated key is shown once after deployment — download the .env file
                          and give it to your bot. Your personal wallet stays completely separate.
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
                      Agents represent your AI bots that need to perform on-chain actions.
                      Each agent gets its own smart account with spending guardrails.
                      Generate a dedicated keypair so your bot has its own wallet, completely separate from yours.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Generate bot keypair — never share your personal keys
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Enforced mode: Secure Account blocks unauthorized transactions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Advisory mode: monitoring + alerts for external wallets
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

            <TabsContent value="workflows" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Funding a Smart Account
                  </CardTitle>
                  <CardDescription>
                    Send ETH to your bot&apos;s smart account so it can operate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    After creating a Secure Account agent, you need to fund it with ETH for gas and operations.
                    The smart account is a standard Ethereum address that accepts ETH from any source.
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Copy the Smart Account address</h4>
                        <p className="text-muted-foreground text-sm">
                          Find the address on the agent card under &ldquo;Secure Account&rdquo; and click the copy icon.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Send ETH from your wallet</h4>
                        <p className="text-muted-foreground text-sm">
                          Open MetaMask (or your preferred wallet) and send ETH to the smart account address.
                          Only send what the bot needs — spending limits protect the rest.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownToLine className="h-5 w-5" />
                    Withdrawing from a Smart Account
                  </CardTitle>
                  <CardDescription>
                    Retrieve ETH from a smart account back to your personal wallet
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    How you withdraw depends on your signer type. Both methods are available from the
                    agent card dropdown menu under <strong>Withdraw</strong>.
                  </p>

                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Wallet Signer (Connected Wallet)
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Your connected MetaMask wallet is the smart account owner, so it can call
                        the <code className="bg-muted px-1 rounded">execute()</code> function directly.
                      </p>
                      <ol className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">1.</span>
                          Click the three-dot menu on the agent card
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">2.</span>
                          Select <strong>Withdraw</strong>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">3.</span>
                          Enter the amount and click Withdraw
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">4.</span>
                          Confirm the transaction in MetaMask
                        </li>
                      </ol>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        Generated Bot Signer
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        The bot&apos;s generated private key is the smart account owner. To withdraw from the dashboard,
                        you&apos;ll paste the bot&apos;s private key to sign the transaction client-side. The key is
                        used in your browser only and is never sent to any server.
                      </p>
                      <ol className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">1.</span>
                          Click the three-dot menu on the agent card
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">2.</span>
                          Select <strong>Withdraw</strong>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">3.</span>
                          Paste the bot&apos;s private key (from the .env file you downloaded)
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">4.</span>
                          Enter the amount and click Withdraw
                        </li>
                        <li className="flex gap-2">
                          <span className="font-mono text-primary">5.</span>
                          The transaction is signed in your browser and broadcast directly
                        </li>
                      </ol>
                      <div className="flex items-start gap-2 mt-3 rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-2">
                        <CheckCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          The private key is validated against the bot&apos;s signer address before use.
                          It is cleared from browser memory after the transaction completes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="font-semibold text-sm mb-2">Programmatic Withdrawal (Bot-Initiated)</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your bot can also withdraw funds by calling <code className="bg-background px-1 rounded">execute()</code> on its smart account:
                    </p>
                    <div className="bg-background rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs">{`import { createWalletClient, http, encodeFunctionData } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.BOT_PRIVATE_KEY);
const client = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});

// Call execute() on the smart account to send ETH
const hash = await client.sendTransaction({
  to: process.env.SMART_ACCOUNT_ADDRESS,
  data: encodeFunctionData({
    abi: [{
      name: "execute",
      type: "function",
      inputs: [
        { name: "target", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
      outputs: [],
    }],
    functionName: "execute",
    args: [
      "0xYOUR_WALLET_ADDRESS",  // destination
      parseEther("0.1"),         // amount
      "0x",                      // empty calldata (ETH transfer)
    ],
  }),
});`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-5 w-5" />
                    End-to-End: Creating and Running a Bot
                  </CardTitle>
                  <CardDescription>
                    Complete workflow from agent creation to autonomous operation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Create agent with Generate Bot Signer</h4>
                        <p className="text-muted-foreground text-sm">
                          Register an agent, select Secure Account, click Generate Bot Signer, then Register.
                          Download the .env file when the private key is revealed.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Fund the smart account</h4>
                        <p className="text-muted-foreground text-sm">
                          Send ETH from your MetaMask wallet to the smart account address shown on the agent card.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Create and activate a policy</h4>
                        <p className="text-muted-foreground text-sm">
                          Define what the bot can do: allowed actions, token allowlist, spending limits, and duration.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        4
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Grant permission and create an API key</h4>
                        <p className="text-muted-foreground text-sm">
                          Link the agent to the policy, then create an API key in Settings for the bot to use.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        5
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Configure and run the bot</h4>
                        <p className="text-muted-foreground text-sm">
                          Give the bot the .env file (private key, smart account address, EntryPoint, chain ID)
                          and the API key. The bot validates actions via the API, then submits UserOperations
                          signed with its private key.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        6
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">Monitor and withdraw</h4>
                        <p className="text-muted-foreground text-sm">
                          Check the Audit page for the bot&apos;s activity. When you want to reclaim funds,
                          use the Withdraw feature from the agent card menu with the bot&apos;s private key.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      <span className="text-muted-foreground">Deploy Secure Account (accepts signer_type: wallet | generated)</span>
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

            <TabsContent value="contracts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Network Information
                  </CardTitle>
                  <CardDescription>
                    Guardrail contracts are deployed on Ethereum Sepolia testnet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Network</p>
                      <p className="font-semibold">Sepolia</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Chain ID</p>
                      <p className="font-semibold font-mono">11155111</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">EntryPoint (v0.6)</p>
                      <p className="font-mono text-xs break-all">0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-primary" />
                      IdentityRegistry
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">ERC-8004 agent identity registration</p>
                    <code className="text-xs font-mono break-all block bg-muted p-2 rounded">0xc1fa477f991C74Cc665E605fC74f0e2B795b5104</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Key functions:</strong> registerAgent, getAgent, isAgentActive
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-primary" />
                      PolicyRegistry
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">On-chain policy and permission storage</p>
                    <code className="text-xs font-mono break-all block bg-muted p-2 rounded">0x92cd41e6a4aA13072CeBCda8830d48f269F058c4</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Key functions:</strong> createPolicy, grantPermission, revokePermission, isPermissionValid
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      PermissionEnforcer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">Action validation with constraints (value, volume, tx count, tokens, protocols, chains)</p>
                    <code className="text-xs font-mono break-all block bg-muted p-2 rounded">0x94991827135fbd0E681B3db51699e4988a7752f1</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Key functions:</strong> validateAction, setConstraints, recordUsage, getRemainingQuota
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-primary" />
                      PriceOracle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">Chainlink-powered ETH/USD and token price feeds for USD conversion</p>
                    <code className="text-xs font-mono break-all block bg-muted p-2 rounded">0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Key functions:</strong> getEthUsdPrice, getEthValue, setTokenFeed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      GuardrailFeeManager
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">Centralized fee configuration for account creation and transfer fees</p>
                    <code className="text-xs font-mono break-all block bg-muted p-2 rounded">0x0f77fdD1AFCe0597339dD340E738CE3dC9A5CC12</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Key functions:</strong> getCreationFeeWei, calculateTransferFee, feeCollector
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-primary" />
                      AgentAccountFactory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">CREATE2 factory for deterministic smart account deployment</p>
                    <code className="text-xs font-mono break-all block bg-muted p-2 rounded">0xA831229B58C05d5bA9ac109f3B29e268A0e5F41E</code>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Key functions:</strong> createAccount (payable), getAddress, getCreationFee
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Fee Structure
                  </CardTitle>
                  <CardDescription>
                    Protocol-level fees enforced on-chain via GuardrailFeeManager
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">Account Creation Fee</h4>
                      <p className="text-2xl font-bold text-primary mb-1">$10 USD</p>
                      <p className="text-sm text-muted-foreground">
                        One-time fee in ETH equivalent, charged at smart account deployment.
                        At ETH = $2,000, this is 0.005 ETH.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">Transfer Fee (Outbound)</h4>
                      <p className="text-2xl font-bold text-primary mb-1">10 bps (0.10%)</p>
                      <p className="text-sm text-muted-foreground">
                        Applied on outbound ETH transfers. Capped at $100 USD per transaction.
                        Inbound deposits are free.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="font-semibold text-sm mb-3">Transfer Fee Examples</h4>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="font-medium">Transfer</div>
                      <div className="font-medium">Fee</div>
                      <div className="font-medium">Transfer</div>
                      <div className="font-medium">Fee</div>
                      <div className="text-muted-foreground">$1,000</div>
                      <div>$1.00</div>
                      <div className="text-muted-foreground">$100,000</div>
                      <div>$100 (cap)</div>
                      <div className="text-muted-foreground">$10,000</div>
                      <div>$10.00</div>
                      <div className="text-muted-foreground">$2,000,000</div>
                      <div>$100 (cap)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Contract Interaction Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto">{`1. Factory.createAccount{value: fee}(owner, agentId, salt)
   └── Deploys AgentSmartAccount(owner, agentId, enforcer, entryPoint, feeManager)
   └── Sends creation fee to feeManager.feeCollector()

2. Account.execute(target, value, data)  [called by owner or via EntryPoint]
   └── feeManager.calculateTransferFee(value)  →  fee
   └── Send fee to feeManager.feeCollector()
   └── Send (value - fee) to target

3. EntryPoint.handleOps(userOps)  [ERC-4337 flow]
   └── Account.validateUserOp(userOp, hash, funds)
       └── Verify ECDSA signature (owner)
       └── enforcer.validateAction(agentId, actionHash, actionData)
           └── Check policy constraints (value, volume, tokens, protocols, chains)
   └── Account.execute(target, value, data)  [if validation passes]`}</pre>
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
                        <p className="font-medium">Generate a dedicated bot signer</p>
                        <p className="text-sm text-muted-foreground">
                          Never give your personal wallet key to a bot. Use &ldquo;Generate Bot Signer&rdquo; during agent creation
                          to create a fresh keypair. The bot gets its own smart account with its own funds, completely
                          isolated from your personal wallet.
                        </p>
                      </div>
                    </li>
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
