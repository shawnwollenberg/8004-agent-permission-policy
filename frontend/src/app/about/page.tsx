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
              The Permission Layer for AI Agents
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Guardrail is the authorization infrastructure for autonomous AI agents.
              Define what your agents can do, enforce limits on-chain, and maintain
              complete audit trails. Think AWS IAM + CloudTrail for crypto agents.
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
                AI agents are becoming autonomous actors in DeFi, managing portfolios,
                executing trades, and interacting with protocols. But how do you trust
                an AI with your assets?
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="bg-background">
                <CardContent className="pt-6">
                  <div className="text-red-500 mb-4">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold mb-2">Unlimited Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Most agents have full access to connected wallets with no spending limits or action restrictions.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-background">
                <CardContent className="pt-6">
                  <div className="text-red-500 mb-4">
                    <Eye className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold mb-2">No Visibility</h3>
                  <p className="text-sm text-muted-foreground">
                    What did your agent do? When? Why? Without audit trails, you're flying blind.
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
                Guardrail provides a complete permission management system for AI agents,
                built on the ERC-8004 standard for on-chain agent authorization.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <Bot className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Agent Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Register your AI agents with unique identities. Track which agent
                    did what, and manage multiple agents from a single dashboard.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <FileCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Granular Policies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Define exactly what actions are allowed: swap, transfer, stake.
                    Set limits on value per transaction, daily volume, and more.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Key className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Permission Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Grant, revoke, and manage permissions in real-time. Set expiration
                    dates and mint permissions on-chain for cryptographic enforcement.
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
                    with ERC-4337 smart account enforcement. Policies are enforced both
                    off-chain (API validation) and on-chain (smart account transaction gating).
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
                      <span>ERC-4337 smart accounts with policy-gated transactions</span>
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
                <div className="bg-muted rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Deployed Contracts (Sepolia)</h3>
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
                        0xf3c8c6BDc54C60EDaE6AE84Ef05B123597C355B3
                      </code>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">AgentAccountFactory</p>
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        0x28bd44158F7A824eB20330D761035cCb7D1D2AD5
                      </code>
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
                    Agent uses a standard EOA wallet. Guardrail validates actions via API
                    and logs everything, but cannot prevent on-chain execution.
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
                    Agent operates through an ERC-4337 smart account. The PermissionEnforcer
                    contract validates every transaction — violations revert before execution.
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
