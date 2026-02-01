'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, sepolia, baseSepolia } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Guardrail',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [mainnet, sepolia, baseSepolia],
  ssr: true,
})

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
