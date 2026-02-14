import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
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
  const [rawInput, setRawInput] = useState('')

  // Sync rawInput when the wei value changes externally (e.g. form reset)
  useEffect(() => {
    if (!value) {
      setRawInput('')
      return
    }
    const converted = fromWei(value, unit)
    // Only overwrite if the current rawInput doesn't already represent this wei value
    // This prevents clobbering mid-typing state like "1." or "0.50"
    try {
      if (rawInput && toWei(rawInput, unit) === value) return
    } catch {
      // rawInput isn't parseable yet, let the external value win
    }
    setRawInput(converted)
  }, [value, unit])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value

      // Allow empty
      if (!raw) {
        setRawInput('')
        onChange('')
        return
      }

      // Only allow digits and a single decimal point
      if (!/^\d*\.?\d*$/.test(raw)) return

      setRawInput(raw)

      // Don't convert incomplete decimals like "1." or "." — just store locally
      if (raw.endsWith('.') || raw === '.') return

      try {
        onChange(toWei(raw, unit))
      } catch {
        // Ignore conversion errors for partial input
      }
    },
    [unit, onChange]
  )

  const handleUnitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newUnit = e.target.value as EthUnit
      // Convert current display to the new unit
      if (value) {
        setRawInput(fromWei(value, newUnit))
      }
      setUnit(newUnit)
    },
    [value]
  )

  return (
    <div className={cn('flex', className)}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={rawInput}
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
