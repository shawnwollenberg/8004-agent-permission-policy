'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Shield,
  Bot,
  FileCheck,
  Key,
  Activity,
  Zap,
  Lock,
  Eye,
  Layers,
  Globe,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Guardrail</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/about" className="text-foreground font-medium">
              About
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <Link href="/">
              <Button>Launch App</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-6">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Built on ERC-8004 Standard</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Smart Accounts with Spending Guardrails for AI Agents
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Give your bots their own wallets — completely separated from yours — with
              built-in spending limits enforced on-chain. Generate a dedicated keypair,
              deploy a smart account, and define exactly what your agent can do.
              Think AWS IAM + CloudTrail for autonomous crypto agents.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline">
                  Read the Docs
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">The Problem</h2>
              <p className="text-lg text-muted-foreground">
                AI agents need private keys to sign transactions autonomously. But sharing your
                personal wallet's private key with a bot means the bot has unlimited access to
                all your assets. There's no separation, no limits, and no kill switch.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="bg-background">
                <CardContent className="pt-6">
                  <div className="text-red-500 mb-4">
                    <Key className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold mb-2">Shared Private Keys</h3>
                  <p className="text-sm text-muted-foreground">
                    Bots need raw private keys to sign transactions, but using your personal wallet
                    key gives them access to everything you own.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardContent className="pt-6">
                  <div className="text-red-500 mb-4">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold mb-2">No Spending Limits</h3>
                  <p className="text-sm text-muted-foreground">
                    Most agents have full access with no per-transaction caps, daily volume limits, or action restrictions.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardContent className="pt-6">
                  <div className="text-red-500 mb-4">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold mb-2">No Kill Switch</h3>
                  <p className="text-sm text-muted-foreground">
                    If something goes wrong, there's no easy way to revoke access or stop actions mid-flight.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">The Solution</h2>
              <p className="text-lg text-muted-foreground">
                Guardrail gives each bot its own wallet with built-in spending guardrails.
                Generate a dedicated keypair, deploy a smart account, and set policies that
                are enforced on-chain. Your personal wallet never touches the bot.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <Key className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Dedicated Bot Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generate a fresh keypair for each bot. The private key is shown once
                    and never stored. Your personal wallet stays completely separate.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Smart Account Deployment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Each bot gets an ERC-4337 smart account. Fund it with only what the bot
                    needs. Unauthorized transactions are blocked before execution.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Spending Guardrails</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Set per-transaction limits, daily volume caps, and action allowlists.
                    Policies are enforced on-chain — bots physically cannot exceed limits.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Activity className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Complete Audit Trail</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Every validation request, policy change, and permission grant is
                    logged. Export to JSON/CSV for compliance and analysis.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How It Works</h2>
              <p className="text-lg text-muted-foreground">
                Integrate Guardrail into your agent's workflow in minutes.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Define Policies</h3>
                  <p className="text-sm text-muted-foreground">
                    Create policies that specify allowed actions, assets, and constraints
                    through our dashboard or API.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Validate Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Before executing any action, your agent calls our API to check
                    if the action is permitted.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Execute Safely</h3>
                  <p className="text-sm text-muted-foreground">
                    If allowed, proceed with the action. If denied, handle gracefully.
                    Everything is logged for audit.
                  </p>
                </div>
              </div>

              <div className="mt-12 bg-background rounded-lg p-6 border">
                <pre className="text-sm overflow-x-auto">{`# Your agent's code
if guardrail.validate(agent_id, action={
    "type": "swap",
    "amount": "1000",
    "token": "USDC"
}):
    # Action is allowed - execute it
    execute_swap(...)
else:
    # Action denied - handle gracefully
    log_denied_action(...)`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* Bot Wallet Separation */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-4">
                    <Key className="h-4 w-4" />
                    <span className="text-sm font-medium">Wallet Separation</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Never Share Your Private Key with a Bot</h2>
                  <p className="text-muted-foreground mb-6">
                    Guardrail generates a fresh keypair for each bot during agent creation.
                    The bot gets its own private key and its own smart account — completely
                    isolated from your personal wallet. You control the guardrails, the bot
                    operates within them.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>One-click keypair generation in the browser</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Private key shown once, never stored on any server</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Download .env file with all bot connection details</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Smart account enforces spending limits even if bot is compromised</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Fund only what the bot needs — your main wallet stays safe</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="font-semibold mb-4">How Bot Signer Generation Works</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium">Register Agent</p>
                        <p className="text-muted-foreground">Choose "Secure Account" and "Generate Bot Signer"</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium">Generate Keypair</p>
                        <p className="text-muted-foreground">A fresh private key + address is created in your browser</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium">Deploy Smart Account</p>
                        <p className="text-muted-foreground">An ERC-4337 account is deployed with the generated address as signer</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                      <div>
                        <p className="font-medium">Save & Configure Bot</p>
                        <p className="text-muted-foreground">Download the .env file and give it to your bot</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                      <div>
                        <p className="font-medium">Set Guardrails</p>
                        <p className="text-muted-foreground">Create policies with spending limits — enforced on-chain</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ERC-8004 Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 mb-4">
                    <Layers className="h-4 w-4" />
                    <span className="text-sm font-medium">On-Chain Standard</span>
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Built on ERC-8004</h2>
                  <p className="text-muted-foreground mb-6">
                    Guardrail implements the ERC-8004 standard for AI agent authorization
                    with Guardrail Secure Accounts for guaranteed enforcement. Policies are enforced both
                    off-chain (API validation) and on-chain (Secure Account transaction gating).
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Standards-compliant agent identity registry</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>On-chain policy storage and enforcement</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Guardrail Secure Accounts with policy-gated transactions</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Mintable permission tokens (NFTs)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Interoperable with other ERC-8004 systems</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-6">
                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Deployed Contracts (Base Mainnet)</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">IdentityRegistry</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xc1fa477f991C74Cc665E605fC74f0e2B795b5104
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">PolicyRegistry</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0x92cd41e6a4aA13072CeBCda8830d48f269F058c4
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">PermissionEnforcer</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xbF63Fa97cfBba99647B410f205730d63d831061c
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">PriceOracle</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xf3c8c6BDc54C60EDaE6AE84Ef05B123597C355B3
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">GuardrailFeeManager</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xD1B7Bd65F2aB60ff84CdDF48f306a599b01d293A
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">AgentAccountFactory</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xCE621A324A8cb40FD424EB0D41286A97f6a6c91C
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Deployed Contracts (Sepolia Testnet)</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">IdentityRegistry</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xc1fa477f991C74Cc665E605fC74f0e2B795b5104
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">PolicyRegistry</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0x92cd41e6a4aA13072CeBCda8830d48f269F058c4
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">PermissionEnforcer</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0x94991827135fbd0E681B3db51699e4988a7752f1
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">GuardrailFeeManager</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0x0f77fdD1AFCe0597339dD340E738CE3dC9A5CC12
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">AgentAccountFactory</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0xA831229B58C05d5bA9ac109f3B29e268A0e5F41E
                        </code>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">PriceOracle</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enforcement Tiers */}
        <section className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Two Enforcement Tiers</h2>
              <p className="text-lg text-muted-foreground">
                Choose the right level of enforcement for your agents. Start with advisory
                monitoring and upgrade to guaranteed on-chain enforcement when ready.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="bg-background border-2 border-amber-500/30">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-8 w-8 text-amber-500" />
                    <CardTitle>Advisory Mode</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monitor external wallets with advisory alerts and reconciliation. Guardrail validates
                    actions via API and logs everything, but cannot prevent on-chain execution.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Off-chain validation API
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Monitoring and alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Full audit trail
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Quick setup — no smart contract needed
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background border-2 border-emerald-500/30">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Lock className="h-8 w-8 text-emerald-500" />
                    <CardTitle>Enforced Mode</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Agent operates through a Guardrail Secure Account. Once assets are in a
                    Secure Account, unauthorized transactions cannot execute.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      On-chain + off-chain enforcement
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Violating transactions revert automatically
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Protocol and chain constraints
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Upgrade from advisory — one-way for security
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Use Cases</h2>
              <p className="text-lg text-muted-foreground">
                Guardrail is designed for any AI agent that needs to interact with blockchain.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <Globe className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>DeFi Trading Bots</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Limit trading to specific pairs, set maximum position sizes,
                    and cap daily trading volume. Perfect for automated trading strategies.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Layers className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Portfolio Managers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Allow rebalancing within defined parameters. Restrict to approved
                    protocols and set maximum allocation percentages.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Zap className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Yield Optimizers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Permit staking and unstaking actions while limiting which protocols
                    can be used and setting minimum lock periods.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to Secure Your Agents?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start managing permissions for your AI agents today. It's free to get started.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/">
                  <Button size="lg">
                    Launch App
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/docs">
                  <Button size="lg" variant="outline">
                    View Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>Guardrail - Built on ERC-8004 Standard</p>
        </div>
      </footer>
    </div>
  )
}
