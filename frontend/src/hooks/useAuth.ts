'use client'

import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Expired if exp is in the past (with 30s buffer for clock skew)
    return payload.exp * 1000 < Date.now() - 30_000
  } catch {
    return true
  }
}

export function useAuth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const storedAddress = localStorage.getItem('auth_address')
    if (token && storedAddress === address && !isTokenExpired(token)) {
      setIsAuthenticated(true)
    } else {
      if (token && isTokenExpired(token)) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_address')
      }
      setIsAuthenticated(false)
    }
    setIsInitialized(true)
  }, [address])

  useEffect(() => {
    const handleExpired = () => {
      setIsAuthenticated(false)
      toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' })
    }
    window.addEventListener('auth-expired', handleExpired)
    return () => window.removeEventListener('auth-expired', handleExpired)
  }, [toast])

  const signIn = useCallback(async () => {
    if (!address) {
      toast({ title: 'No wallet connected', description: 'Connect a wallet to sign in.', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const { nonce } = await auth.getNonce()

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Guardrail',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      })

      const messageString = message.prepareMessage()
      const signature = await signMessageAsync({ message: messageString })

      const { token } = await auth.verify(messageString, signature)

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_address', address)
      setIsAuthenticated(true)
      toast({ title: 'Signed in', variant: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' })
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  }, [address, signMessageAsync, toast])

  const signOut = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_address')
    setIsAuthenticated(false)
  }, [])

  return {
    isConnected,
    isAuthenticated,
    isLoading,
    isInitialized,
    address,
    signIn,
    signOut,
  }
}
