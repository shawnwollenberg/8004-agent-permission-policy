'use client'

import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/api'

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
    }
    window.addEventListener('auth-expired', handleExpired)
    return () => window.removeEventListener('auth-expired', handleExpired)
  }, [])

  const signIn = useCallback(async () => {
    if (!address) {
      console.error('No address available')
      return
    }

    setIsLoading(true)
    try {
      console.log('Getting nonce...')
      const { nonce } = await auth.getNonce()
      console.log('Got nonce:', nonce)

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
      console.log('Requesting signature...')
      const signature = await signMessageAsync({ message: messageString })
      console.log('Got signature')

      console.log('Verifying...')
      const { token } = await auth.verify(messageString, signature)
      console.log('Verified, got token')

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_address', address)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Sign in failed:', error)
      setIsLoading(false)
      // Don't re-throw, just log so button becomes clickable again
    } finally {
      setIsLoading(false)
    }
  }, [address, signMessageAsync])

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
