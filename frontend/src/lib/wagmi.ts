'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, baseSepolia, base } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
if (!projectId && typeof window !== 'undefined') {
  console.warn('[Guardrail] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set — using demo project ID. Get one at https://cloud.walletconnect.com')
}

export const config = getDefaultConfig({
  appName: 'Guardrail',
  projectId: projectId || 'demo-project-id',
  chains: [base, sepolia, baseSepolia],
  ssr: true,
})

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
