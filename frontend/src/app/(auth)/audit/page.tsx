'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { audit, agents, policies, type AuditLog } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import { Activity, Download, Filter } from 'lucide-react'
import * as Select from '@radix-ui/react-select'

const eventTypes = [
  'auth.login',
  'agent.created',
  'agent.updated',
  'agent.deleted',
  'agent.registered_onchain',
  'policy.created',
  'policy.updated',
  'policy.activated',
  'policy.revoked',
  'policy.deleted',
  'permission.created',
  'permission.revoked',
  'permission.minted',
  'validation.request',
  'api_key.created',
  'api_key.revoked',
  'webhook.created',
  'webhook.updated',
  'webhook.deleted',
]

export default function AuditPage() {
  const [filters, setFilters] = useState({
    event_type: '',
    agent_id: '',
    policy_id: '',
    limit: 50,
    offset: 0,
  })

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit', filters],
    queryFn: () =>
      audit.list({
        ...filters,
        event_type: filters.event_type || undefined,
        agent_id: filters.agent_id || undefined,
        policy_id: filters.policy_id || undefined,
      }),
  })

  const { data: agentsList } = useQuery({
    queryKey: ['agents'],
    queryFn: agents.list,
  })

  const { data: policiesList } = useQuery({
    queryKey: ['policies'],
    queryFn: policies.list,
  })

  const getEventBadgeVariant = (eventType: string) => {
    if (eventType.includes('created')) return 'success'
    if (eventType.includes('deleted') || eventType.includes('revoked'))
      return 'destructive'
    if (eventType.includes('updated') || eventType.includes('activated'))
      return 'default'
    return 'secondary'
  }

  const getAgentName = (agentId?: string) => {
    if (!agentId) return null
    return agentsList?.find((a) => a.id === agentId)?.name || agentId.slice(0, 8)
  }

  const getPolicyName = (policyId?: string) => {
    if (!policyId) return null
    return policiesList?.find((p) => p.id === policyId)?.name || policyId.slice(0, 8)
  }

  const handleExport = async (format: 'json' | 'csv') => {
    const token = localStorage.getItem('auth_token')
    const url = audit.export(format)
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit_logs.${format}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Log</h2>
          <p className="text-muted-foreground">
            Complete history of all actions and events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Select.Root
                value={filters.event_type || '__all__'}
                onValueChange={(value) =>
                  setFilters({ ...filters, event_type: value === '__all__' ? '' : value, offset: 0 })
                }
              >
                <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <Select.Value placeholder="All event types" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded-md border bg-popover shadow-md max-h-60">
                    <Select.Viewport className="p-1">
                      <Select.Item
                        value="__all__"
                        className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Select.ItemText>All event types</Select.ItemText>
                      </Select.Item>
                      {eventTypes.map((type) => (
                        <Select.Item
                          key={type}
                          value={type}
                          className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                        >
                          <Select.ItemText>{type}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div>
              <Select.Root
                value={filters.agent_id || '__all__'}
                onValueChange={(value) =>
                  setFilters({ ...filters, agent_id: value === '__all__' ? '' : value, offset: 0 })
                }
              >
                <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <Select.Value placeholder="All agents" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded-md border bg-popover shadow-md">
                    <Select.Viewport className="p-1">
                      <Select.Item
                        value="__all__"
                        className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Select.ItemText>All agents</Select.ItemText>
                      </Select.Item>
                      {agentsList?.map((agent) => (
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
              <Select.Root
                value={filters.policy_id || '__all__'}
                onValueChange={(value) =>
                  setFilters({ ...filters, policy_id: value === '__all__' ? '' : value, offset: 0 })
                }
              >
                <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <Select.Value placeholder="All policies" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded-md border bg-popover shadow-md">
                    <Select.Viewport className="p-1">
                      <Select.Item
                        value="__all__"
                        className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                      >
                        <Select.ItemText>All policies</Select.ItemText>
                      </Select.Item>
                      {policiesList?.map((policy) => (
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
        </CardContent>
      </Card>

      {/* Audit Logs */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : auditLogs?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No audit logs</h3>
            <p className="text-muted-foreground">
              Activity will appear here as you use the system
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {auditLogs?.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getEventBadgeVariant(log.event_type) as any}>
                        {log.event_type}
                      </Badge>
                      {log.agent_id && (
                        <Badge variant="outline">
                          Agent: {getAgentName(log.agent_id)}
                        </Badge>
                      )}
                      {log.policy_id && (
                        <Badge variant="outline">
                          Policy: {getPolicyName(log.policy_id)}
                        </Badge>
                      )}
                    </div>
                    {log.details && (
                      <pre className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatDateTime(log.created_at)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {auditLogs && auditLogs.length >= filters.limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={filters.offset === 0}
            onClick={() =>
              setFilters({ ...filters, offset: filters.offset - filters.limit })
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setFilters({ ...filters, offset: filters.offset + filters.limit })
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
