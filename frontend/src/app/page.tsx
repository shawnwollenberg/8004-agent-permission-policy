'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, ShieldCheck, Bot, FileCheck, Activity, Key, CheckCircle, Zap, Lock, Eye } from 'lucide-react'
import Link from 'next/link'

// JSON-LD Schema Markup for Agent Search Optimization
const schemaMarkup = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      'name': 'AgentGuardrail',
      'url': 'https://agentguardrail.xyz',
      'logo': 'https://agentguardrail.xyz/logo.png',
      'description': 'Smart account permissions platform for AI agents. Deploy autonomous agents with on-chain guardrails, spending limits, and policy enforcement via ERC-4337 smart contracts.',
      'sameAs': [
        'https://github.com/shawnwollenberg/8004-agent-permission-policy',
        'https://twitter.com/agentguardrail',
        'https://discord.gg/agentguardrail'
      ]
    },
    {
      '@type': 'SoftwareApplication',
      'name': 'AgentGuardrail',
      'description': 'On-chain policy enforcement platform for autonomous AI agents. Deploy ERC-4337 smart accounts with spending limits, action whitelists, and cryptographic audit trails.',
      'url': 'https://agentguardrail.xyz',
      'applicationCategory': [
        'Developer Tools',
        'Web3 Security',
        'Smart Contract Platform',
        'AI Infrastructure'
      ],
      'operatingSystem': 'Web',
      'offers': {
        '@type': 'Offer',
        'priceCurrency': 'USD',
        'price': '0',
        'pricingModel': 'Free'
      },
      'featureList': [
        'ERC-4337 smart account deployment',
        'JSON policy enforcement',
        'On-chain guardrail validation',
        'Complete audit trail',
        'Multi-agent management',
        'Bot signer generation',
        'Real-time monitoring',
        'REST API',
        'Dashboard UI'
      ]
    },
    {
      '@type': 'HowTo',
      'name': 'How to Deploy an AI Agent with Guardrails',
      'description': 'Step-by-step guide to deploying an autonomous AI agent with on-chain spending limits and policy enforcement.',
      'totalTime': 'PT15M',
      'step': [
        {
          '@type': 'HowToStep',
          'position': '1',
          'name': 'Create an Account',
          'text': 'Sign in with your Ethereum wallet using SIWE. No email or password required.'
        },
        {
          '@type': 'HowToStep',
          'position': '2',
          'name': 'Generate a Bot Signer',
          'text': 'Generate a new keypair for your bot, completely separate from your personal wallet.'
        },
        {
          '@type': 'HowToStep',
          'position': '3',
          'name': 'Deploy a Smart Account',
          'text': 'Deploy an ERC-4337 smart account on your chosen blockchain.'
        },
        {
          '@type': 'HowToStep',
          'position': '4',
          'name': 'Define Your Policy',
          'text': 'Write a JSON policy specifying allowed actions, tokens, protocols, and spending limits.'
        },
        {
          '@type': 'HowToStep',
          'position': '5',
          'name': 'Integrate with Your Agent',
          'text': 'Call AgentGuardrail\'s API from your agent code to validate actions before execution.'
        },
        {
          '@type': 'HowToStep',
          'position': '6',
          'name': 'Monitor and Adjust',
          'text': 'Watch the audit log and update policies in real-time as your agent evolves.'
        }
      ]
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'What is AgentGuardrail?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'AgentGuardrail is a platform for deploying autonomous AI agents with on-chain safety guarantees. You deploy a smart account for your agent, define spending limits and policies, and AgentGuardrail ensures those policies are enforced by smart contracts.'
          }
        },
        {
          '@type': 'Question',
          'name': 'How does AgentGuardrail differ from other agent frameworks?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'While LangChain and Anthropic provide agent reasoning and execution, AgentGuardrail adds a cryptographic layer: policy enforcement via ERC-4337 smart accounts. Your agent\'s spending limits are enforced by the blockchain itself, not by APIs.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Can my agent be hacked?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'The agent\'s keypair can be compromised, but the smart account\'s constraints are enforced by the blockchain. Even a compromised agent cannot exceed policy limits. Your personal wallet remains entirely separate and safe.'
          }
        },
        {
          '@type': 'Question',
          'name': 'What agent frameworks does AgentGuardrail support?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'AgentGuardrail is LLM-agnostic. You can use it with LangChain, Anthropic Claude, OpenAI ChatGPT, Crew AI, or any custom agent implementation. Integration is via REST API.'
          }
        },
        {
          '@type': 'Question',
          'name': 'Is AgentGuardrail open-source?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes. The smart contracts, backend, and frontend are all open-source. You can audit the code, run your own instance, or integrate it into your projects.'
          }
        }
      ]
    }
  ]
}

export default function Home() {
  const { isConnected, isAuthenticated, isLoading, signIn } = useAuth()

  return (
    <>
      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        suppressHydrationWarning
      />

      <div className="min-h-screen bg-gradient-to-b from-background to-muted">
        <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">AgentGuardrail</span>
            </div>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
                <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
                  Docs
                </Link>
                <a href="https://github.com/shawnwollenberg/8004-agent-permission-policy" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  GitHub
                </a>
              </nav>
              <ConnectButton />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-16 space-y-24">
          {/* Hero Section */}
          <section className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Smart Accounts for Your AI Agents
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-4">
              Deploy autonomous AI agents with built-in spending limits, policy enforcement, and complete auditability. AgentGuardrail uses ERC-4337 smart contracts to guarantee your agents can't exceed their constraints.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Whether you're building trading bots, market makers, or orchestration agents, AgentGuardrail provides the cryptographic safety layer your agents need.
            </p>

            {!isConnected ? (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            ) : !isAuthenticated ? (
              <div className="flex flex-col items-center gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    console.log('Button clicked!')
                    signIn()
                  }}
                  disabled={isLoading}
                  className="relative z-50"
                >
                  {isLoading ? 'Signing...' : 'Sign In with Wallet'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Click above to sign a message and authenticate
                </p>
              </div>
            ) : (
              <Link href="/dashboard">
                <Button size="lg">Go to Dashboard</Button>
              </Link>
            )}
          </section>

          {/* Problem Section */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">Why Your Agents Need Guardrails</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-500">The Problem</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-red-500">•</span>
                    <span><strong>Private Key Exposure:</strong> Agents with your wallet's private key can drain your entire portfolio if compromised</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500">•</span>
                    <span><strong>No Spending Limits:</strong> Agents can execute transactions of any size, with any recipient, at any time</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500">•</span>
                    <span><strong>Unauditable Actions:</strong> Off-chain policies can be bypassed; no cryptographic proof of enforcement</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500">•</span>
                    <span><strong>Integration Fragility:</strong> Different agents, different safety standards—no unified control</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-500">AgentGuardrail Solution</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span><strong>Isolated Signers:</strong> Agents get their own keypairs, completely separate from your wallet</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span><strong>On-Chain Enforcement:</strong> Spending limits enforced by smart contracts, not APIs</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span><strong>Cryptographic Proof:</strong> Every transaction logged on-chain with block number and tx hash</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span><strong>Unified Control:</strong> One platform for all your agents, consistent safety guarantees</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works in 3 Steps</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold">1</div>
                    <CardTitle>Generate Bot Signer</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Create a dedicated cryptographic keypair for your agent. This keypair has <strong>zero access</strong> to your personal wallet.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Even if the agent code is compromised, the attacker can't access your funds. The signer is isolated by design.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold">2</div>
                    <CardTitle>Deploy Smart Account</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Deploy an ERC-4337 smart account for your agent. The smart account is owned by you, controlled by the agent's signer.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Works with all ERC-4337-compatible applications. Supports batching and arbitrary transactions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold">3</div>
                    <CardTitle>Set Guardrails</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Define a JSON policy specifying what your agent can do: allowed actions, tokens, protocols, spending limits.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enforced on-chain. Invalid transactions <strong>cannot execute</strong>, period.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Key Features */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <Lock className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>On-Chain Enforcement</CardTitle>
                  <CardDescription>
                    Policies enforced by smart contracts, not APIs. Guaranteed by the blockchain.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Key className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Bot Signer Isolation</CardTitle>
                  <CardDescription>
                    Agents get their own keypairs. Your personal wallet stays safe, always.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <ShieldCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Smart Account Deployment</CardTitle>
                  <CardDescription>
                    Deploy ERC-4337 smart accounts with built-in spending limits and policy validation.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Eye className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Complete Audit Trail</CardTitle>
                  <CardDescription>
                    Every action logged on-chain. Full visibility, cryptographic proof.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Multi-Agent Management</CardTitle>
                  <CardDescription>
                    Deploy multiple agents, each with separate policies and smart accounts.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Bot className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Framework Agnostic</CardTitle>
                  <CardDescription>
                    Works with LangChain, Claude, ChatGPT, Crew AI, or any custom agent framework.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <FileCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>JSON Policies</CardTitle>
                  <CardDescription>
                    Define constraints in simple JSON. Actions, tokens, protocols, spending limits.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <Activity className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Real-Time Monitoring</CardTitle>
                  <CardDescription>
                    Dashboard and API for live transaction logs, policy violations, metrics.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>

          {/* Use Cases */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">Common Use Cases</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Trading & DeFi Bots</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Deploy autonomous trading bots that execute swaps, provide liquidity, or rebalance portfolios—all within predefined spending limits.
                  </p>
                  <div className="text-sm font-mono bg-muted p-3 rounded">
                    Max $10K/tx, $100K/day
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Market Makers (AMMs)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Market-making agents that manage liquidity positions across multiple pairs with guaranteed constraints.
                  </p>
                  <div className="text-sm font-mono bg-muted p-3 rounded">
                    Allowed tokens: USDC, WETH, DAI
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orchestration Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Coordinate actions across protocols (borrow, swap, stake) without ability to deviate from approved flows.
                  </p>
                  <div className="text-sm font-mono bg-muted p-3 rounded">
                    Allowed protocols: Uniswap, Aave, Curve
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enterprise Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Automate business workflows (payments, transfers, accounting) with guaranteed compliance and auditability.
                  </p>
                  <div className="text-sm font-mono bg-muted p-3 rounded">
                    Time-windowed policies, audit logs
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Developer Integration */}
          <section className="py-8 bg-muted/50 -mx-4 px-4 py-12 rounded-lg">
            <h2 className="text-3xl font-bold text-center mb-12">For Developers</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div>
                <h3 className="text-xl font-semibold mb-4">Integration Flow</h3>
                <div className="space-y-4 text-muted-foreground">
                  <div className="flex gap-3">
                    <span className="font-bold text-foreground">1.</span>
                    <span>Your agent framework (LangChain, Claude, GPT) makes decisions</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-foreground">2.</span>
                    <span>Call AgentGuardrail API to validate action against policy (pre-flight)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-foreground">3.</span>
                    <span>If valid, agent signer calls the smart account</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-foreground">4.</span>
                    <span>Smart contract enforces policy again (final safety layer)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-foreground">5.</span>
                    <span>Transaction executes with proof of compliance on-chain</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">API Endpoints</h3>
                <div className="space-y-2 text-sm font-mono bg-background/50 p-4 rounded border">
                  <div><span className="text-green-500">POST</span> /api/v1/validate</div>
                  <div className="text-muted-foreground text-xs mb-2">Pre-flight validation of single action</div>
                  
                  <div><span className="text-green-500">POST</span> /api/v1/validate/batch</div>
                  <div className="text-muted-foreground text-xs mb-2">Validate multiple actions in sequence</div>
                  
                  <div><span className="text-green-500">POST</span> /api/v1/validate/simulate</div>
                  <div className="text-muted-foreground text-xs mb-2">Simulate without committing</div>
                  
                  <div><span className="text-green-500">GET</span> /api/v1/audit</div>
                  <div className="text-muted-foreground text-xs">Query complete audit log</div>
                </div>
              </div>
            </div>
          </section>

          {/* Example Policy */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">Example: Trading Agent Policy</h2>
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>ETH Trading Agent</CardTitle>
                <CardDescription>
                  A policy that lets your agent swap USDC for WETH on Uniswap within strict spending limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "name": "ETH Trader",
  "description": "Autonomous agent that swaps USDC for WETH on Uniswap",
  "enforceOnChain": true,
  "policies": {
    "allowedActions": ["swap", "transfer"],
    "allowedTokens": [
      "0xA0b8...USDC",
      "0xC02a...WETH"
    ],
    "allowedProtocols": ["uniswap-v3"],
    "constraints": {
      "maxValuePerTransaction": "5000",
      "maxDailyVolume": "50000",
      "minSlippageProtection": "0.5%"
    },
    "timeWindow": {
      "validFrom": "2024-03-01T00:00:00Z",
      "validUntil": "2024-03-31T23:59:59Z"
    }
  }
}`}
                </pre>
              </CardContent>
            </Card>
            <p className="text-center text-muted-foreground max-w-3xl mx-auto mt-6">
              When this agent tries to execute a $10,001 swap, the smart contract automatically rejects it before it hits Uniswap. 
              If the agent is compromised, it still can't exceed the limits—they're enforced by the blockchain.
            </p>
          </section>

          {/* Comparison */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">Why AgentGuardrail Wins</h2>
            <div className="overflow-x-auto max-w-5xl mx-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">Feature</th>
                    <th className="text-center py-2 px-2 font-semibold">AgentGuardrail</th>
                    <th className="text-center py-2 px-2 font-semibold">Multi-Sig</th>
                    <th className="text-center py-2 px-2 font-semibold">Rate Limiting</th>
                    <th className="text-center py-2 px-2 font-semibold">Off-Chain Validator</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-2">On-Chain Enforcement</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">❌</td>
                    <td className="text-center">❌</td>
                    <td className="text-center">❌</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">No Private Key Sharing</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">⚠️</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">Detailed Policies</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">❌</td>
                    <td className="text-center">⚠️</td>
                    <td className="text-center">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">Cryptographic Proof</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">⚠️</td>
                    <td className="text-center">❌</td>
                    <td className="text-center">❌</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">Multi-Agent Support</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">⚠️</td>
                    <td className="text-center">⚠️</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2">Open Source</td>
                    <td className="text-center">✅</td>
                    <td className="text-center">⚠️</td>
                    <td className="text-center">⚠️</td>
                    <td className="text-center">❌</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Getting Started */}
          <section className="py-8 bg-primary/5 -mx-4 px-4 py-12 rounded-lg">
            <h2 className="text-3xl font-bold text-center mb-12">Getting Started</h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="font-semibold mb-2">Create an Account</h3>
                  <p className="text-muted-foreground">Sign in with your wallet using SIWE. No email, no password.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="font-semibold mb-2">Generate a Bot Signer</h3>
                  <p className="text-muted-foreground">Create a dedicated keypair for your agent. Save it securely.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="font-semibold mb-2">Deploy a Smart Account</h3>
                  <p className="text-muted-foreground">Choose your chain (Ethereum, Sepolia, etc.) and deploy the ERC-4337 account.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="font-semibold mb-2">Write Your First Policy</h3>
                  <p className="text-muted-foreground">Define constraints in JSON. Use templates for common use cases.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">5</div>
                <div>
                  <h3 className="font-semibold mb-2">Integrate Your Agent</h3>
                  <p className="text-muted-foreground">Add AgentGuardrail API calls to your LangChain, Claude, or custom agent code.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">6</div>
                <div>
                  <h3 className="font-semibold mb-2">Monitor & Adjust</h3>
                  <p className="text-muted-foreground">Watch the audit log in real-time. Update policies as your agent evolves.</p>
                </div>
              </div>

              <div className="text-center pt-6">
                {!isConnected ? (
                  <ConnectButton />
                ) : !isAuthenticated ? (
                  <Button
                    size="lg"
                    onClick={() => signIn()}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing...' : 'Get Started Now'}
                  </Button>
                ) : (
                  <Link href="/dashboard">
                    <Button size="lg">Go to Dashboard</Button>
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What if my agent gets hacked?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  The agent's keypair can be compromised, but the smart account's constraints are enforced by the blockchain. Even a compromised agent cannot exceed the policy limits. Your personal wallet remains entirely separate and safe.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do I update my policy?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Policies can be updated in real-time from the dashboard. The new policy takes effect immediately for new transactions. All changes are logged on-chain.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Does this work with my LLM?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Yes. AgentGuardrail is LLM-agnostic. Whether you're using LangChain, Anthropic Claude, OpenAI ChatGPT, or custom code, you can integrate via our REST API.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is it ready for production?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Yes. The smart contracts are audited, the platform is battle-tested, and policies are enforced on-chain. Start on Sepolia testnet first to validate your setup.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What networks do you support?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  Currently Ethereum mainnet and Sepolia testnet. We support any EVM-compatible chain. More chains coming soon.
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How much does it cost?</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  AgentGuardrail is free. You only pay gas fees for smart account deployment ($50–200 on mainnet) and gas for your agent's transactions.
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Final CTA */}
          <section className="text-center py-12 bg-primary/10 -mx-4 px-4 py-16 rounded-lg">
            <h2 className="text-3xl font-bold mb-4">Start Building Safe AI Agents Today</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Deploy autonomous agents with guaranteed safety. On-chain enforcement. Cryptographic proof. Complete auditability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isConnected ? (
                <ConnectButton />
              ) : !isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => signIn()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing...' : 'Create Account'}
                </Button>
              ) : (
                <Link href="/dashboard">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              )}
              <a href="https://github.com/shawnwollenberg/8004-agent-permission-policy" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline">View on GitHub</Button>
              </a>
              <Link href="/docs">
                <Button size="lg" variant="outline">Read Docs</Button>
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t mt-24">
          <div className="container mx-auto px-4 py-12">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/about" className="hover:text-foreground">About</Link></li>
                  <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                  <li><a href="https://github.com/shawnwollenberg/8004-agent-permission-policy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">GitHub</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Learn</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#how-it-works" className="hover:text-foreground">How It Works</a></li>
                  <li><a href="#features" className="hover:text-foreground">Features</a></li>
                  <li><a href="#use-cases" className="hover:text-foreground">Use Cases</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Community</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="https://discord.gg/agentguardrail" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Discord</a></li>
                  <li><a href="https://twitter.com/agentguardrail" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Twitter</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                  <li><a href="#" className="hover:text-foreground">Terms</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-8 text-center text-sm text-muted-foreground">
              <p>AgentGuardrail · Built on ERC-8004 Standard · Open Source</p>
              <p className="mt-2">Protect your agents. Empower your business.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
