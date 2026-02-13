'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agents, type Agent } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { CopyableAddress } from '@/components/ui/copyable-address'
import { Plus, MoreVertical, Trash2, Link as LinkIcon, Bot, Shield, ShieldCheck, ArrowUpCircle, Rocket } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAccount } from 'wagmi'
import { useToast } from '@/hooks/useToast'

export default function AgentsPage() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [upgradeAgentId, setUpgradeAgentId] = useState<string | null>(null)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    agent_address: '',
    wallet_type: 'eoa' as 'eoa' | 'smart_account',
  })

  const { toast } = useToast()

  const { data: agentsList, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agents.list,
  })

  const deployMutation = useMutation({
    mutationFn: ({ agentId, signerAddress }: { agentId: string; signerAddress: string }) =>
      agents.deploySmartAccount(agentId, { signer_address: signerAddress }),
    onSuccess: (sa) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({
        title: 'Secure Account deployed',
        description: `Address: ${sa.account_address.slice(0, 10)}...`,
        variant: 'success',
      })
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({
        title: 'Deployment failed',
        description: e.message + '. Retry from agent menu.',
        variant: 'destructive',
      })
    },
  })

  const createMutation = useMutation({
    mutationFn: agents.create,
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsCreateOpen(false)
      const signerAddr = newAgent.agent_address || address || ''
      setNewAgent({ name: '', description: '', agent_address: '', wallet_type: 'eoa' })
      toast({ title: 'Agent registered', variant: 'success' })
      if (agent.wallet_type === 'smart_account' && signerAddr) {
        deployMutation.mutate({ agentId: agent.id, signerAddress: signerAddr })
      }
    },
    onError: (e: Error) => toast({ title: 'Failed to register agent', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: agents.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({ title: 'Agent deleted', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to delete agent', description: e.message, variant: 'destructive' }),
  })

  const registerOnchainMutation = useMutation({
    mutationFn: agents.registerOnchain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      toast({ title: 'Agent registered on-chain', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to register on-chain', description: e.message, variant: 'destructive' }),
  })

  const upgradeMutation = useMutation({
    mutationFn: (id: string) => agents.upgradeToSmartAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsUpgradeOpen(false)
      setUpgradeAgentId(null)
      toast({ title: 'Upgraded to Secure Account', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to upgrade', description: e.message, variant: 'destructive' }),
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'deleted':
        return <Badge variant="destructive">Deleted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getEnforcementBadge = (agent: Agent) => {
    if (agent.enforcement_level === 'enforced') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Enforced
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        <Shield className="mr-1 h-3 w-3" />
        Advisory
      </Badge>
    )
  }

  const handleCreate = () => {
    const data: { name: string; description?: string; agent_address?: string; wallet_type?: string } = {
      name: newAgent.name,
      wallet_type: newAgent.wallet_type,
    }
    if (newAgent.description) data.description = newAgent.description
    if (newAgent.agent_address) data.agent_address = newAgent.agent_address
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agents</h2>
          <p className="text-muted-foreground">
            Manage your AI agents and their identities
          </p>
        </div>
        <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Dialog.Trigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Register Agent
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold">
                Register New Agent
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                Add an AI agent to your account to manage its permissions
              </Dialog.Description>

              <div className="space-y-4">
                {/* Wallet Type Selector */}
                <div>
                  <Label className="mb-2 block">Wallet Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewAgent({ ...newAgent, wallet_type: 'eoa' })}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        newAgent.wallet_type === 'eoa'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-sm">External Wallet</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Monitor with advisory alerts and reconciliation
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAgent({ ...newAgent, wallet_type: 'smart_account', agent_address: address || '' })}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        newAgent.wallet_type === 'smart_account'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium text-sm">Secure Account</span>
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">Recommended</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Guaranteed enforcement — unauthorized transactions cannot execute
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={newAgent.name}
                    onChange={(e) =>
                      setNewAgent({ ...newAgent, name: e.target.value })
                    }
                    placeholder="Trading Bot Alpha"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newAgent.description}
                    onChange={(e) =>
                      setNewAgent({ ...newAgent, description: e.target.value })
                    }
                    placeholder="Automated trading agent for DeFi"
                  />
                </div>
                <div>
                  <Label htmlFor="agent_address">
                    {newAgent.wallet_type === 'smart_account' ? 'Signer Address' : 'Agent Address'} (optional)
                  </Label>
                  <Input
                    id="agent_address"
                    value={newAgent.agent_address}
                    onChange={(e) =>
                      setNewAgent({ ...newAgent, agent_address: e.target.value })
                    }
                    placeholder="0x..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {newAgent.wallet_type === 'smart_account'
                      ? 'The wallet that will sign transactions. A Guardrail Secure Account will be deployed.'
                      : 'The wallet address the agent will use for transactions'}
                  </p>
                </div>

                {newAgent.wallet_type === 'smart_account' && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground">
                      A Guardrail Secure Account will be deployed for this agent. Once assets are in a Guardrail
                      Secure Account, unauthorized transactions cannot execute.
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
                  disabled={!newAgent.name || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Agent'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Upgrade Confirmation Dialog */}
      <Dialog.Root open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">
              Upgrade to Guardrail Secure Account
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-4">
              This will upgrade the agent to a Guardrail Secure Account with guaranteed enforcement.
            </Dialog.Description>
            <div className="space-y-3 mb-6">
              <div className="rounded-md bg-muted p-3 text-sm space-y-2">
                <p>This upgrade will:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Deploy a Guardrail Secure Account controlled by the current wallet</li>
                  <li>The existing wallet becomes the signer for the Secure Account</li>
                  <li>All policies will be enforced on-chain going forward</li>
                  <li>Once assets are in the Secure Account, unauthorized transactions cannot execute</li>
                </ul>
              </div>
              <div className="rounded-md border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
                This is a one-way upgrade. You cannot downgrade back to advisory mode.
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button
                onClick={() => upgradeAgentId && upgradeMutation.mutate(upgradeAgentId)}
                disabled={upgradeMutation.isPending}
              >
                {upgradeMutation.isPending ? 'Upgrading...' : 'Confirm Upgrade'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : agentsList?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No agents yet</h3>
            <p className="text-muted-foreground mb-4">
              Register your first AI agent to start managing permissions
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agentsList?.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    {agent.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {agent.description || 'No description'}
                  </p>
                </div>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className="min-w-[200px] rounded-md bg-popover p-1 shadow-md">
                      {!agent.onchain_registry_id && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() =>
                            registerOnchainMutation.mutate(agent.id)
                          }
                        >
                          <LinkIcon className="h-4 w-4" />
                          Register On-chain
                        </DropdownMenu.Item>
                      )}
                      {agent.wallet_type === 'smart_account' && !agent.smart_account_address && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => {
                            const signerAddr = agent.agent_address || address || ''
                            if (signerAddr) {
                              deployMutation.mutate({ agentId: agent.id, signerAddress: signerAddr })
                            } else {
                              toast({ title: 'No signer address available', variant: 'destructive' })
                            }
                          }}
                        >
                          <Rocket className="h-4 w-4" />
                          Deploy Secure Account
                        </DropdownMenu.Item>
                      )}
                      {agent.wallet_type === 'eoa' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => {
                            setUpgradeAgentId(agent.id)
                            setIsUpgradeOpen(true)
                          }}
                        >
                          <ArrowUpCircle className="h-4 w-4" />
                          Upgrade to Secure Account
                        </DropdownMenu.Item>
                      )}
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                        onClick={() => deleteMutation.mutate(agent.id)}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(agent.status)}
                    {getEnforcementBadge(agent)}
                    {agent.onchain_registry_id && (
                      <Badge variant="outline">On-chain</Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {agent.wallet_type === 'smart_account' ? 'Secure Account' : 'External Wallet'}
                    </p>
                    {agent.wallet_type === 'smart_account' && !agent.smart_account_address ? (
                      <p className="text-sm font-mono text-amber-500 animate-pulse">
                        Deploying...
                      </p>
                    ) : agent.wallet_type === 'smart_account' && agent.smart_account_address ? (
                      <CopyableAddress address={agent.smart_account_address} />
                    ) : agent.agent_address ? (
                      <CopyableAddress address={agent.agent_address} />
                    ) : null}
                  </div>
                  {agent.wallet_type === 'smart_account' && agent.signer_address && (
                    <div>
                      <p className="text-xs text-muted-foreground">Signer</p>
                      <CopyableAddress address={agent.signer_address} />
                    </div>
                  )}
                  {agent.onchain_registry_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Registry ID
                      </p>
                      <CopyableAddress address={agent.onchain_registry_id} />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Registered {formatDate(agent.created_at)}
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
