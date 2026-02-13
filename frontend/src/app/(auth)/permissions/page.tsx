'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { permissions, agents, policies, type Permission } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { Plus, MoreVertical, Trash2, Coins, Key } from 'lucide-react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Select from '@radix-ui/react-select'
import { useToast } from '@/hooks/useToast'

export default function PermissionsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newPermission, setNewPermission] = useState({
    agent_id: '',
    policy_id: '',
  })

  const { data: permissionsList, isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissions.list(),
  })

  const { data: agentsList, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: agents.list,
  })

  const { data: policiesList, isLoading: policiesLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: policies.list,
  })

  const { toast } = useToast()

  const createMutation = useMutation({
    mutationFn: permissions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      setIsCreateOpen(false)
      setNewPermission({ agent_id: '', policy_id: '' })
      toast({ title: 'Permission granted', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to grant permission', description: e.message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: permissions.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast({ title: 'Permission revoked', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to revoke permission', description: e.message, variant: 'destructive' }),
  })

  const mintMutation = useMutation({
    mutationFn: permissions.mint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      toast({ title: 'Permission minted on-chain', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to mint permission', description: e.message, variant: 'destructive' }),
  })

  const getAgentName = (agentId: string) => {
    return agentsList?.find((a) => a.id === agentId)?.name || 'Unknown Agent'
  }

  const getPolicyName = (policyId: string) => {
    return policiesList?.find((p) => p.id === policyId)?.name || 'Unknown Policy'
  }

  const getStatusBadge = (perm: Permission) => {
    if (perm.revoked_at) {
      return <Badge variant="destructive">Revoked</Badge>
    }
    if (perm.valid_until && new Date(perm.valid_until) < new Date()) {
      return <Badge variant="secondary">Expired</Badge>
    }
    if (perm.status === 'active') {
      return <Badge variant="success">Active</Badge>
    }
    return <Badge variant="outline">{perm.status}</Badge>
  }

  const activePolicies = policiesList?.filter((p) => p.status === 'active') || []
  const activeAgents = agentsList?.filter((a) => a.status === 'active') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Permissions</h2>
          <p className="text-muted-foreground">
            Grant and manage agent permissions
          </p>
        </div>
        <Dialog.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Dialog.Trigger asChild>
            <Button disabled={activePolicies.length === 0 || activeAgents.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Grant Permission
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
              <Dialog.Title className="text-lg font-semibold">
                Grant Permission
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mb-4">
                Assign a policy to an agent
              </Dialog.Description>

              <div className="space-y-4">
                <div>
                  <Label>Agent</Label>
                  <Select.Root
                    value={newPermission.agent_id}
                    onValueChange={(value) =>
                      setNewPermission({ ...newPermission, agent_id: value })
                    }
                  >
                    <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <Select.Value placeholder="Select an agent" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="overflow-hidden rounded-md border bg-popover shadow-md">
                        <Select.Viewport className="p-1">
                          {activeAgents.map((agent) => (
                            <Select.Item
                              key={agent.id}
                              value={agent.id}
                              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                            >
                              <Select.ItemText>{agent.name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
                <div>
                  <Label>Policy</Label>
                  <Select.Root
                    value={newPermission.policy_id}
                    onValueChange={(value) =>
                      setNewPermission({ ...newPermission, policy_id: value })
                    }
                  >
                    <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <Select.Value placeholder="Select a policy" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="overflow-hidden rounded-md border bg-popover shadow-md">
                        <Select.Viewport className="p-1">
                          {activePolicies.map((policy) => (
                            <Select.Item
                              key={policy.id}
                              value={policy.id}
                              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                            >
                              <Select.ItemText>{policy.name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline">Cancel</Button>
                </Dialog.Close>
                <Button
                  onClick={() => createMutation.mutate(newPermission)}
                  disabled={
                    !newPermission.agent_id ||
                    !newPermission.policy_id ||
                    createMutation.isPending
                  }
                >
                  {createMutation.isPending ? 'Granting...' : 'Grant Permission'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {agentsLoading || policiesLoading || isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : activePolicies.length === 0 || activeAgents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Cannot grant permissions</h3>
            <p className="text-muted-foreground mb-4">
              You need at least one active agent and one active policy
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/agents">Manage Agents</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/policies">Manage Policies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : permissionsList?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No permissions yet</h3>
            <p className="text-muted-foreground mb-4">
              Grant your first permission to link an agent with a policy
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Grant Permission
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {permissionsList?.map((perm) => (
            <Card key={perm.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {getAgentName(perm.agent_id)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Policy: {getPolicyName(perm.policy_id)}
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
                      {!perm.minted_at && perm.status === 'active' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => mintMutation.mutate(perm.id)}
                        >
                          <Coins className="h-4 w-4" />
                          Mint On-chain
                        </DropdownMenu.Item>
                      )}
                      {perm.status === 'active' && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                          onClick={() => deleteMutation.mutate(perm.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(perm)}
                    {perm.minted_at && (
                      <Badge variant="outline">
                        <Coins className="mr-1 h-3 w-3" />
                        Minted
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valid From</p>
                    <p className="text-sm">{formatDate(perm.valid_from)}</p>
                  </div>
                  {perm.valid_until && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expires</p>
                      <p className="text-sm">
                        {formatDate(perm.valid_until)} (
                        {formatRelativeTime(perm.valid_until)})
                      </p>
                    </div>
                  )}
                  {perm.onchain_token_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">Token ID</p>
                      <p className="text-sm font-mono truncate">
                        {perm.onchain_token_id}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Granted {formatDate(perm.created_at)}
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
