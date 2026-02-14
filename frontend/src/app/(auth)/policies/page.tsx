'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { policies, type Policy, type PolicyDefinition } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UnitSelector } from '@/components/ui/unit-selector'
import { formatDate } from '@/lib/utils'
import { formatWithUnit } from '@/lib/units'
import { CopyableAddress } from '@/components/ui/copyable-address'
import {
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useToast } from '@/hooks/useToast'

const CHAIN_OPTIONS: { id: number; name: string }[] = [
  { id: 1, name: 'Ethereum Mainnet' },
  { id: 11155111, name: 'Sepolia Testnet' },
  { id: 10, name: 'Optimism' },
  { id: 42161, name: 'Arbitrum One' },
  { id: 8453, name: 'Base' },
  { id: 137, name: 'Polygon' },
]

const defaultDefinition: PolicyDefinition = {
  actions: ['swap', 'transfer'],
  assets: {
    tokens: [],
    protocols: [],
    chains: [],
  },
  constraints: {
    maxValuePerTx: '5000',
    maxDailyVolume: '50000',
  },
}

export default function PoliciesPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    definition: defaultDefinition,
  })

  const { toast } = useToast()

  const { data: policiesList, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: policies.list,
  })

  const createMutation = useMutation({
    mutationFn: policies.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setIsCreateOpen(false)
      setShowAdvanced(false)
      setNewPolicy({ name: '', description: '', definition: defaultDefinition })
      toast({ title: 'Policy created', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to create policy', description: e.message, variant: 'destructive' }),
  })

  const activateMutation = useMutation({
    mutationFn: policies.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      toast({ title: 'Policy activated', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to activate policy', description: e.message, variant: 'destructive' }),
  })

  const revokeMutation = useMutation({
    mutationFn: policies.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      toast({ title: 'Policy revoked', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to revoke policy', description: e.message, variant: 'destructive' }),
  })

  const reactivateMutation = useMutation({
    mutationFn: policies.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      toast({ title: 'Policy reactivated', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to reactivate policy', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: policies.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      toast({ title: 'Policy deleted', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to delete policy', description: e.message, variant: 'destructive' }),
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'revoked':
        return <Badge variant="destructive">Revoked</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const toggleChain = (chainId: number) => {
    const currentChains = newPolicy.definition.assets?.chains || []
    const updated = currentChains.includes(chainId)
      ? currentChains.filter((c) => c !== chainId)
      : [...currentChains, chainId]
    setNewPolicy({
      ...newPolicy,
      definition: {
        ...newPolicy.definition,
        assets: {
          ...newPolicy.definition.assets,
          chains: updated,
        },
      },
    })
  }

  const handleCreate = () => {
    // Clean up empty optional fields before sending
    const def = { ...newPolicy.definition }

    // Remove empty arrays from assets
    if (def.assets) {
      const cleanAssets: PolicyDefinition['assets'] = {}
      if (def.assets.tokens && def.assets.tokens.length > 0 && def.assets.tokens[0] !== '') {
        cleanAssets.tokens = def.assets.tokens.filter((t) => t !== '')
      }
      if (def.assets.protocols && def.assets.protocols.length > 0 && def.assets.protocols[0] !== '') {
        cleanAssets.protocols = def.assets.protocols.filter((p) => p !== '')
      }
      if (def.assets.chains && def.assets.chains.length > 0) {
        cleanAssets.chains = def.assets.chains
      }
      if (Object.keys(cleanAssets).length > 0) {
        def.assets = cleanAssets
      } else {
        delete def.assets
      }
    }

    // Remove empty constraint fields
    if (def.constraints) {
      if (!def.constraints.maxValuePerTx) delete def.constraints.maxValuePerTx
      if (!def.constraints.maxDailyVolume) delete def.constraints.maxDailyVolume
      if (!def.constraints.maxTxCount) delete def.constraints.maxTxCount
    }

    // Remove empty duration
    if (def.duration) {
      if (!def.duration.validFrom && !def.duration.validUntil) {
        delete def.duration
      }
    }

    createMutation.mutate({
      name: newPolicy.name,
      description: newPolicy.description,
      definition: def,
    })
  }

  const getChainName = (chainId: number) => {
    return CHAIN_OPTIONS.find((c) => c.id === chainId)?.name || `Chain ${chainId}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Policies</h2>
          <p className="text-muted-foreground">
            Define permission rules for your agents
          </p>
        </div>
        <Dialog.Root open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setShowAdvanced(false) }}>
          <Dialog.Trigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg max-h-[85vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold">
                Create New Policy
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                Define the rules for what actions an agent can perform
              </Dialog.Description>

              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <Label htmlFor="name">Policy Name</Label>
                  <Input
                    id="name"
                    value={newPolicy.name}
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, name: e.target.value })
                    }
                    placeholder="Trading Policy"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newPolicy.description}
                    onChange={(e) =>
                      setNewPolicy({ ...newPolicy, description: e.target.value })
                    }
                    placeholder="Allows swapping up to $5k per transaction"
                  />
                </div>

                {/* Actions */}
                <div>
                  <Label htmlFor="actions">Allowed Actions</Label>
                  <Input
                    id="actions"
                    value={newPolicy.definition.actions.join(', ')}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        definition: {
                          ...newPolicy.definition,
                          actions: e.target.value.split(',').map((a) => a.trim()),
                        },
                      })
                    }
                    placeholder="swap, transfer, stake"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated. Options: swap, transfer, approve, stake, unstake, deposit, withdraw, mint, burn, bridge, claim, vote, delegate, lp_add, lp_remove, borrow, repay, liquidate, or * for all
                  </p>
                </div>

                {/* Constraints */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Constraints</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="maxValuePerTx" className="text-xs text-muted-foreground">Max Value Per Tx</Label>
                      <UnitSelector
                        id="maxValuePerTx"
                        value={newPolicy.definition.constraints?.maxValuePerTx || ''}
                        onChange={(weiValue) =>
                          setNewPolicy({
                            ...newPolicy,
                            definition: {
                              ...newPolicy.definition,
                              constraints: {
                                ...newPolicy.definition.constraints,
                                maxValuePerTx: weiValue,
                              },
                            },
                          })
                        }
                        placeholder="1.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxDailyVolume" className="text-xs text-muted-foreground">Max Daily Volume</Label>
                      <UnitSelector
                        id="maxDailyVolume"
                        value={newPolicy.definition.constraints?.maxDailyVolume || ''}
                        onChange={(weiValue) =>
                          setNewPolicy({
                            ...newPolicy,
                            definition: {
                              ...newPolicy.definition,
                              constraints: {
                                ...newPolicy.definition.constraints,
                                maxDailyVolume: weiValue,
                              },
                            },
                          })
                        }
                        placeholder="10.0"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Values are stored in wei. Use the unit selector to enter in ETH, Gwei, or Wei.
                  </p>
                  <div>
                    <Label htmlFor="maxTxCount" className="text-xs text-muted-foreground">Max Transactions Per Day</Label>
                    <Input
                      id="maxTxCount"
                      type="number"
                      value={newPolicy.definition.constraints?.maxTxCount || ''}
                      onChange={(e) =>
                        setNewPolicy({
                          ...newPolicy,
                          definition: {
                            ...newPolicy.definition,
                            constraints: {
                              ...newPolicy.definition.constraints,
                              maxTxCount: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          },
                        })
                      }
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* Allowed Tokens */}
                <div>
                  <Label htmlFor="tokens">Allowed Token Addresses</Label>
                  <Input
                    id="tokens"
                    value={newPolicy.definition.assets?.tokens?.join(', ') || ''}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        definition: {
                          ...newPolicy.definition,
                          assets: {
                            ...newPolicy.definition.assets,
                            tokens: e.target.value ? e.target.value.split(',').map((t) => t.trim()) : [],
                          },
                        },
                      })
                    }
                    placeholder="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated contract addresses. Leave empty to allow all tokens.
                  </p>
                </div>

                {/* Allowed Protocols */}
                <div>
                  <Label htmlFor="protocols">Allowed Protocols</Label>
                  <Input
                    id="protocols"
                    value={newPolicy.definition.assets?.protocols?.join(', ') || ''}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        definition: {
                          ...newPolicy.definition,
                          assets: {
                            ...newPolicy.definition.assets,
                            protocols: e.target.value ? e.target.value.split(',').map((p) => p.trim()) : [],
                          },
                        },
                      })
                    }
                    placeholder="uniswap-v3, aave-v3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated protocol names or addresses. Leave empty to allow all protocols.
                  </p>
                </div>

                {/* Allowed Chains */}
                <div>
                  <Label className="mb-2 block">Allowed Chains</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHAIN_OPTIONS.map((chain) => {
                      const selected = newPolicy.definition.assets?.chains?.includes(chain.id) || false
                      return (
                        <button
                          key={chain.id}
                          type="button"
                          onClick={() => toggleChain(chain.id)}
                          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-muted text-muted-foreground hover:border-muted-foreground/30'
                          }`}
                        >
                          {chain.name}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select none to allow all chains. Restricts which chains the agent can operate on or bridge to.
                  </p>
                </div>

                {/* Advanced: Validity Period */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Advanced Options
                  </button>
                </div>

                {showAdvanced && (
                  <div className="space-y-3 rounded-md border p-3">
                    <Label className="text-sm font-medium">Validity Period</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="validFrom" className="text-xs text-muted-foreground">Valid From</Label>
                        <Input
                          id="validFrom"
                          type="datetime-local"
                          value={newPolicy.definition.duration?.validFrom || ''}
                          onChange={(e) =>
                            setNewPolicy({
                              ...newPolicy,
                              definition: {
                                ...newPolicy.definition,
                                duration: {
                                  ...newPolicy.definition.duration,
                                  validFrom: e.target.value || undefined,
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="validUntil" className="text-xs text-muted-foreground">Valid Until</Label>
                        <Input
                          id="validUntil"
                          type="datetime-local"
                          value={newPolicy.definition.duration?.validUntil || ''}
                          onChange={(e) =>
                            setNewPolicy({
                              ...newPolicy,
                              definition: {
                                ...newPolicy.definition,
                                duration: {
                                  ...newPolicy.definition.duration,
                                  validUntil: e.target.value || undefined,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no time restrictions. The policy will be valid indefinitely.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button
                  onClick={handleCreate}
                  disabled={!newPolicy.name || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Policy'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : policiesList?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No policies yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first policy to define agent permissions
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policiesList?.map((policy) => (
            <Card key={policy.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{policy.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {policy.description || 'No description'}
                  </p>
                </div>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="min-w-[160px] rounded-md bg-popover p-1 shadow-md">
                      {policy.status === 'draft' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => activateMutation.mutate(policy.id)}
                        >
                          <Play className="h-4 w-4" />
                          Activate
                        </DropdownMenu.Item>
                      )}
                      {policy.status === 'active' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => revokeMutation.mutate(policy.id)}
                        >
                          <Pause className="h-4 w-4" />
                          Revoke
                        </DropdownMenu.Item>
                      )}
                      {policy.status === 'revoked' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => reactivateMutation.mutate(policy.id)}
                        >
                          <Play className="h-4 w-4" />
                          Reactivate
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                        onClick={() => deleteMutation.mutate(policy.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(policy.status)}
                    <Badge variant="outline">v{policy.version}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Actions</p>
                    <div className="flex flex-wrap gap-1">
                      {policy.definition.actions.map((action) => (
                        <Badge key={action} variant="secondary">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {policy.definition.constraints && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Constraints
                      </p>
                      <div className="text-sm space-y-0.5">
                        {policy.definition.constraints.maxValuePerTx && (
                          <p>Max/tx: {formatWithUnit(policy.definition.constraints.maxValuePerTx, 'eth')}</p>
                        )}
                        {policy.definition.constraints.maxDailyVolume && (
                          <p>Max/day: {formatWithUnit(policy.definition.constraints.maxDailyVolume, 'eth')}</p>
                        )}
                        {policy.definition.constraints.maxTxCount && (
                          <p>Max txs/day: {policy.definition.constraints.maxTxCount}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {policy.definition.assets?.tokens && policy.definition.assets.tokens.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tokens</p>
                      <div className="flex flex-wrap gap-1">
                        {policy.definition.assets.tokens.map((token) => (
                          <Badge key={token} variant="outline" className="font-mono text-[10px]">
                            {token.length > 10 ? `${token.slice(0, 6)}...${token.slice(-4)}` : token}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {policy.definition.assets?.protocols && policy.definition.assets.protocols.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Protocols</p>
                      <div className="flex flex-wrap gap-1">
                        {policy.definition.assets.protocols.map((protocol) => (
                          <Badge key={protocol} variant="outline">
                            {protocol}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {policy.definition.assets?.chains && policy.definition.assets.chains.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Chains</p>
                      <div className="flex flex-wrap gap-1">
                        {policy.definition.assets.chains.map((chainId) => (
                          <Badge key={chainId} variant="outline">
                            {getChainName(chainId)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {policy.definition.duration?.validUntil && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Expires</p>
                      <p className="text-sm">{formatDate(policy.definition.duration.validUntil)}</p>
                    </div>
                  )}
                  {policy.onchain_hash && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">On-chain Policy ID</p>
                      <CopyableAddress address={policy.onchain_hash} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(policy.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
