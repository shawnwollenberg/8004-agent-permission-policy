'use client'

import { useQuery } from '@tanstack/react-query'
import { agents, policies, permissions, audit } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bot, FileCheck, Key, Activity, TrendingUp, AlertCircle, Shield, ShieldCheck } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default function DashboardPage() {
  const { data: agentsList } = useQuery({
    queryKey: ['agents'],
    queryFn: agents.list,
  })

  const { data: policiesList } = useQuery({
    queryKey: ['policies'],
    queryFn: policies.list,
  })

  const { data: permissionsList } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissions.list(),
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['audit', { limit: 10 }],
    queryFn: () => audit.list({ limit: 10 }),
  })

  const activeAgents = agentsList?.filter((a) => a.status === 'active').length || 0
  const enforcedAgents = agentsList?.filter((a) => a.status === 'active' && a.enforcement_level === 'enforced').length || 0
  const advisoryAgents = agentsList?.filter((a) => a.status === 'active' && a.enforcement_level !== 'enforced').length || 0
  const activePolicies = policiesList?.filter((p) => p.status === 'active').length || 0
  const activePermissions = permissionsList?.filter((p) => p.status === 'active').length || 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAgents}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                {enforcedAgents} enforced
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="h-3 w-3 text-amber-500" />
                {advisoryAgents} advisory
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePolicies}</div>
            <p className="text-xs text-muted-foreground">
              {policiesList?.filter((p) => p.status === 'draft').length || 0} drafts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePermissions}</div>
            <p className="text-xs text-muted-foreground">
              {permissionsList?.filter((p) => p.minted_at).length || 0} minted on-chain
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">events in last 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs?.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{log.event_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{log.event_type.split('.')[0]}</Badge>
                </div>
              ))}
              {(!auditLogs || auditLogs.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/agents"
                className="block rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Register New Agent</p>
                    <p className="text-xs text-muted-foreground">
                      Add an AI agent to manage permissions
                    </p>
                  </div>
                </div>
              </a>
              <a
                href="/policies"
                className="block rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Create Policy</p>
                    <p className="text-xs text-muted-foreground">
                      Define new permission rules
                    </p>
                  </div>
                </div>
              </a>
              <a
                href="/permissions"
                className="block rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Grant Permission</p>
                    <p className="text-xs text-muted-foreground">
                      Assign a policy to an agent
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Permissions */}
      {permissionsList && permissionsList.some((p) => p.valid_until) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permissionsList
                .filter((p) => {
                  if (!p.valid_until) return false
                  const expiry = new Date(p.valid_until)
                  const sevenDaysFromNow = new Date()
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
                  return expiry < sevenDaysFromNow && expiry > new Date()
                })
                .slice(0, 3)
                .map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">Permission {perm.id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {formatRelativeTime(perm.valid_until!)}
                      </p>
                    </div>
                    <Badge variant="warning">Expiring</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
