import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Guardrail - Smart Account Permissions for AI Agents',
  description: 'Create dedicated smart accounts for your AI bots with spending guardrails. Separate bot wallets from personal wallets, set transaction limits, and enforce policies on-chain. Built on ERC-8004 and ERC-4337.',
  keywords: [
    'AI agent smart account',
    'bot wallet separation',
    'AI agent permissions',
    'on-chain spending limits',
    'ERC-4337 smart account',
    'ERC-8004',
    'AI agent guardrails',
    'bot signer generation',
    'crypto agent policy',
    'DeFi bot security',
    'agent spending limits',
    'autonomous agent wallet',
  ],
  openGraph: {
    title: 'Guardrail - Smart Account Permissions for AI Agents',
    description: 'Create dedicated smart accounts for your AI bots. Separate bot wallets from personal wallets, set transaction limits, and enforce spending policies on-chain.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guardrail - Smart Account Permissions for AI Agents',
    description: 'Create dedicated smart accounts for your AI bots. Separate bot wallets from personal wallets, set transaction limits, and enforce spending policies on-chain.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
