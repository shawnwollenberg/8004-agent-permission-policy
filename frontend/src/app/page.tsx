'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Bot, FileCheck, Activity } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const { isConnected, isAuthenticated, isLoading, signIn } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Guardrail</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Guardrails for Your AI Agents
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Safely authorize what your AI agents can do on-chain.
            Permission controls, policy enforcement, and complete audit trails.
          </p>

          {!isConnected ? (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          ) : !isAuthenticated ? (
            <Button size="lg" onClick={signIn} disabled={isLoading}>
              {isLoading ? 'Signing...' : 'Sign In with Wallet'}
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <Bot className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Agent Management</CardTitle>
              <CardDescription>
                Register and manage your AI agents with on-chain identity
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileCheck className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Policy Engine</CardTitle>
              <CardDescription>
                Define granular policies for actions, assets, and constraints
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Permission Control</CardTitle>
              <CardDescription>
                Grant, revoke, and mint on-chain permissions with ERC-8004
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Activity className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Complete history of all actions, validations, and policy changes
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Example Policy</h2>
          <Card className="max-w-2xl mx-auto text-left">
            <CardContent className="pt-6">
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`{
  "actions": ["swap", "transfer"],
  "assets": {
    "tokens": ["0xA0b8...USDC", "0xC02a...WETH"],
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
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>Guardrail · Built on ERC-8004 Standard</p>
        </div>
      </footer>
    </div>
  )
}
