export type EthUnit = 'eth' | 'gwei' | 'wei'

const DECIMALS: Record<EthUnit, number> = {
  wei: 0,
  gwei: 9,
  eth: 18,
}

export function toWei(value: string, unit: EthUnit): string {
  if (!value || value === '0') return '0'
  if (unit === 'wei') return value

  const decimals = DECIMALS[unit]
  const parts = value.split('.')
  const whole = parts[0] || '0'
  const fraction = parts[1] || ''

  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  const multiplier = BigInt('1' + '0'.repeat(decimals))
  const wholeBig = BigInt(whole) * multiplier
  const fractionBig = BigInt(paddedFraction)

  return (wholeBig + fractionBig).toString()
}

export function fromWei(wei: string, unit: EthUnit): string {
  if (!wei || wei === '0') return '0'
  if (unit === 'wei') return wei

  const decimals = DECIMALS[unit]
  const divisor = BigInt('1' + '0'.repeat(decimals))
  const weiBig = BigInt(wei)

  const whole = weiBig / divisor
  const remainder = weiBig % divisor

  if (remainder === BigInt(0)) return whole.toString()

  const remainderStr = remainder.toString().padStart(decimals, '0')
  const trimmed = remainderStr.replace(/0+$/, '')
  return `${whole}.${trimmed}`
}

export function formatWithUnit(wei: string, unit: EthUnit): string {
  const value = fromWei(wei, unit)
  return `${value} ${unit.toUpperCase()}`
}
