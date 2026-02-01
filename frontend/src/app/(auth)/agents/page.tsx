'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agents, type Agent } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatAddress } from '@/lib/utils'
import { Plus, MoreVertical, Trash2, Link as LinkIcon, Bot } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function AgentsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    agent_address: '',
  })

  const { data: agentsList, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agents.list,
  })

  const createMutation = useMutation({
    mutationFn: agents.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setIsCreateOpen(false)
      setNewAgent({ name: '', description: '', agent_address: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: agents.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  const registerOnchainMutation = useMutation({
    mutationFn: agents.registerOnchain,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
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
                    Agent Address (optional)
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
                    The Ethereum address the agent will use for transactions
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button
                  onClick={() => createMutation.mutate(newAgent)}
                  disabled={!newAgent.name || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Agent'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

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
                    <DropdownMenu.Content className="min-w-[160px] rounded-md bg-popover p-1 shadow-md">
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
                  <div className="flex items-center gap-2">
                    {getStatusBadge(agent.status)}
                    {agent.onchain_registry_id && (
                      <Badge variant="outline">On-chain</Badge>
                    )}
                  </div>
                  {agent.agent_address && (
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-sm font-mono">
                        {formatAddress(agent.agent_address)}
                      </p>
                    </div>
                  )}
                  {agent.onchain_registry_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Registry ID
                      </p>
                      <p className="text-sm font-mono truncate">
                        {agent.onchain_registry_id}
                      </p>
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
