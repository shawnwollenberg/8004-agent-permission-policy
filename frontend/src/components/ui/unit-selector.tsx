import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { type EthUnit, toWei, fromWei } from '@/lib/units'

interface UnitSelectorProps {
  value: string // wei value
  onChange: (weiValue: string) => void
  placeholder?: string
  id?: string
  className?: string
}

const UNITS: { value: EthUnit; label: string }[] = [
  { value: 'eth', label: 'ETH' },
  { value: 'gwei', label: 'Gwei' },
  { value: 'wei', label: 'Wei' },
]

export function UnitSelector({ value, onChange, placeholder, id, className }: UnitSelectorProps) {
  const [unit, setUnit] = useState<EthUnit>('eth')

  const displayValue = value ? fromWei(value, unit) : ''

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (!raw) {
        onChange('')
        return
      }
      // Allow partial decimal input (e.g. "1.")
      if (raw.endsWith('.') || raw === '0.') return onChange(toWei(raw + '0', unit))
      try {
        onChange(toWei(raw, unit))
      } catch {
        // Ignore invalid input
      }
    },
    [unit, onChange]
  )

  const handleUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setUnit(e.target.value as EthUnit)
    },
    []
  )

  return (
    <div className={cn('flex', className)}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder || '0.0'}
        className="flex h-10 w-full rounded-l-md border border-r-0 border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <select
        value={unit}
        onChange={handleUnitChange}
        className="h-10 rounded-r-md border border-input bg-muted px-2 text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {UNITS.map((u) => (
          <option key={u.value} value={u.value}>
            {u.label}
          </option>
        ))}
      </select>
    </div>
  )
}
