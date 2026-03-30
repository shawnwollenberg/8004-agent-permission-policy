'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { sepolia, baseSepolia, base } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
if (!projectId && typeof window !== 'undefined') {
  console.warn('[Guardrail] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set — using demo project ID. Get one at https://cloud.walletconnect.com')
}

// mainnet.base.org blocks browser requests (403). Use env override or a
// CORS-friendly public endpoint.
export const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://base.publicnode.com'

export const config = getDefaultConfig({
  appName: 'Guardrail',
  projectId: projectId || 'demo-project-id',
  chains: [base, sepolia, baseSepolia],
  transports: {
    [base.id]: http(BASE_RPC_URL),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
