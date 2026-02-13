'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyableAddressProps {
  address: string
  label?: string
  className?: string
}

export function CopyableAddress({ address, label, className = '' }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false)

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={address}
      className={`group inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors ${className}`}
    >
      <span>{truncated}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </button>
  )
}
