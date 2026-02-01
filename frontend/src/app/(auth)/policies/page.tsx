'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { policies, type Policy, type PolicyDefinition } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  FileCheck,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const defaultDefinition: PolicyDefinition = {
  actions: ['swap', 'transfer'],
  assets: {
    tokens: [],
    protocols: [],
  },
  constraints: {
    maxValuePerTx: '5000',
    maxDailyVolume: '50000',
  },
}

export default function PoliciesPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    definition: defaultDefinition,
  })

  const { data: policiesList, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: policies.list,
  })

  const createMutation = useMutation({
    mutationFn: policies.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setIsCreateOpen(false)
      setNewPolicy({ name: '', description: '', definition: defaultDefinition })
    },
  })

  const activateMutation = useMutation({
    mutationFn: policies.activate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  })

  const revokeMutation = useMutation({
    mutationFn: policies.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: policies.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['policies'] }),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Policies</h2>
          <p className="text-muted-foreground">
            Define permission rules for your agents
          </p>
        </div>
        <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Dialog.Trigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Policy
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold">
                Create New Policy
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                Define the rules for what actions an agent can perform
              </Dialog.Description>

              <div className="space-y-4">
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
                <div>
                  <Label htmlFor="actions">Actions (comma-separated)</Label>
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
                    placeholder="swap, transfer"
                  />
                </div>
                <div>
                  <Label htmlFor="maxValuePerTx">Max Value Per Transaction</Label>
                  <Input
                    id="maxValuePerTx"
                    value={newPolicy.definition.constraints?.maxValuePerTx || ''}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        definition: {
                          ...newPolicy.definition,
                          constraints: {
                            ...newPolicy.definition.constraints,
                            maxValuePerTx: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="5000"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDailyVolume">Max Daily Volume</Label>
                  <Input
                    id="maxDailyVolume"
                    value={newPolicy.definition.constraints?.maxDailyVolume || ''}
                    onChange={(e) =>
                      setNewPolicy({
                        ...newPolicy,
                        definition: {
                          ...newPolicy.definition,
                          constraints: {
                            ...newPolicy.definition.constraints,
                            maxDailyVolume: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button
                  onClick={() => createMutation.mutate(newPolicy)}
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
                      <p className="text-sm">
                        Max/tx: ${policy.definition.constraints.maxValuePerTx || '-'}
                      </p>
                      <p className="text-sm">
                        Max/day: ${policy.definition.constraints.maxDailyVolume || '-'}
                      </p>
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
