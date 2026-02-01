'use client'

import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/api'

export function useAuth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const storedAddress = localStorage.getItem('auth_address')
    if (token && storedAddress === address) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
  }, [address])

  const signIn = useCallback(async () => {
    if (!address) return

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
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
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
    address,
    signIn,
    signOut,
  }
}
