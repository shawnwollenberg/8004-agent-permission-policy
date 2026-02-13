'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeys, webhooks, type ApiKey, type Webhook } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { Plus, Trash2, Key, Bell, Copy, Check } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { useToast } from '@/hooks/useToast'

const webhookEventOptions = [
  { value: '*', label: 'All events' },
  { value: 'agent.created', label: 'Agent created' },
  { value: 'agent.deleted', label: 'Agent deleted' },
  { value: 'policy.created', label: 'Policy created' },
  { value: 'policy.activated', label: 'Policy activated' },
  { value: 'policy.revoked', label: 'Policy revoked' },
  { value: 'permission.created', label: 'Permission created' },
  { value: 'permission.revoked', label: 'Permission revoked' },
  { value: 'validation.request', label: 'Validation request' },
]

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false)
  const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false)
  const [newKey, setNewKey] = useState({ name: '' })
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: ['*'] })
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  const { toast } = useToast()

  const { data: apiKeysList } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeys.list,
  })

  const { data: webhooksList } = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooks.list,
  })

  const createKeyMutation = useMutation({
    mutationFn: apiKeys.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setCreatedKey(data.key!)
      toast({ title: 'API key created', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to create API key', description: e.message, variant: 'destructive' }),
  })

  const deleteKeyMutation = useMutation({
    mutationFn: apiKeys.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({ title: 'API key deleted', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to delete API key', description: e.message, variant: 'destructive' }),
  })

  const createWebhookMutation = useMutation({
    mutationFn: webhooks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setIsCreateWebhookOpen(false)
      setNewWebhook({ name: '', url: '', events: ['*'] })
      toast({ title: 'Webhook created', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to create webhook', description: e.message, variant: 'destructive' }),
  })

  const deleteWebhookMutation = useMutation({
    mutationFn: webhooks.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast({ title: 'Webhook deleted', variant: 'success' })
    },
    onError: (e: Error) => toast({ title: 'Failed to delete webhook', description: e.message, variant: 'destructive' }),
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage API keys and webhook configurations
        </p>
      </div>

      <Tabs.Root defaultValue="api-keys">
        <Tabs.List className="flex border-b mb-6">
          <Tabs.Trigger
            value="api-keys"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            <Key className="mr-2 h-4 w-4 inline" />
            API Keys
          </Tabs.Trigger>
          <Tabs.Trigger
            value="webhooks"
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            <Bell className="mr-2 h-4 w-4 inline" />
            Webhooks
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="api-keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access
                </CardDescription>
              </div>
              <Dialog.Root
                open={isCreateKeyOpen}
                onOpenChange={(open) => {
                  setIsCreateKeyOpen(open)
                  if (!open) {
                    setCreatedKey(null)
                    setNewKey({ name: '' })
                  }
                }}
              >
                <Dialog.Trigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Key
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
                    <Dialog.Title className="text-lg font-semibold">
                      {createdKey ? 'API Key Created' : 'Create API Key'}
                    </Dialog.Title>

                    {createdKey ? (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          Make sure to copy your API key now. You won't be able
                          to see it again!
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <code className="flex-1 text-sm font-mono break-all">
                            {createdKey}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(createdKey)}
                          >
                            {copiedKey ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="mt-6 flex justify-end">
                          <Dialog.Close asChild>
                            <Button>Done</Button>
                          </Dialog.Close>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Label htmlFor="key-name">Key Name</Label>
                        <Input
                          id="key-name"
                          value={newKey.name}
                          onChange={(e) =>
                            setNewKey({ name: e.target.value })
                          }
                          placeholder="Production API Key"
                        />
                        <div className="mt-6 flex justify-end gap-3">
                          <Dialog.Close asChild>
                            <Button variant="outline">Cancel</Button>
                          </Dialog.Close>
                          <Button
                            onClick={() => createKeyMutation.mutate(newKey)}
                            disabled={
                              !newKey.name || createKeyMutation.isPending
                            }
                          >
                            {createKeyMutation.isPending
                              ? 'Creating...'
                              : 'Create Key'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </CardHeader>
            <CardContent>
              {apiKeysList?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No API keys created yet
                </p>
              ) : (
                <div className="divide-y">
                  {apiKeysList?.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {key.key_prefix}... • Created {formatDate(key.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteKeyMutation.mutate(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="webhooks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Receive notifications when events occur
                </CardDescription>
              </div>
              <Dialog.Root
                open={isCreateWebhookOpen}
                onOpenChange={setIsCreateWebhookOpen}
              >
                <Dialog.Trigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Webhook
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                  <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
                    <Dialog.Title className="text-lg font-semibold">
                      Add Webhook
                    </Dialog.Title>
                    <div className="mt-4 space-y-4">
                      <div>
                        <Label htmlFor="webhook-name">Name</Label>
                        <Input
                          id="webhook-name"
                          value={newWebhook.name}
                          onChange={(e) =>
                            setNewWebhook({ ...newWebhook, name: e.target.value })
                          }
                          placeholder="Production Webhook"
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhook-url">URL</Label>
                        <Input
                          id="webhook-url"
                          value={newWebhook.url}
                          onChange={(e) =>
                            setNewWebhook({ ...newWebhook, url: e.target.value })
                          }
                          placeholder="https://your-server.com/webhook"
                        />
                      </div>
                      <div>
                        <Label>Events</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {webhookEventOptions.map((event) => (
                            <label
                              key={event.value}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={newWebhook.events.includes(event.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (event.value === '*') {
                                      setNewWebhook({
                                        ...newWebhook,
                                        events: ['*'],
                                      })
                                    } else {
                                      setNewWebhook({
                                        ...newWebhook,
                                        events: [
                                          ...newWebhook.events.filter(
                                            (e) => e !== '*'
                                          ),
                                          event.value,
                                        ],
                                      })
                                    }
                                  } else {
                                    setNewWebhook({
                                      ...newWebhook,
                                      events: newWebhook.events.filter(
                                        (e) => e !== event.value
                                      ),
                                    })
                                  }
                                }}
                                className="rounded"
                              />
                              {event.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <Dialog.Close asChild>
                        <Button variant="outline">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={() => createWebhookMutation.mutate(newWebhook)}
                        disabled={
                          !newWebhook.name ||
                          !newWebhook.url ||
                          newWebhook.events.length === 0 ||
                          createWebhookMutation.isPending
                        }
                      >
                        {createWebhookMutation.isPending
                          ? 'Creating...'
                          : 'Add Webhook'}
                      </Button>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </CardHeader>
            <CardContent>
              {webhooksList?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No webhooks configured
                </p>
              ) : (
                <div className="divide-y">
                  {webhooksList?.map((webhook) => (
                    <div
                      key={webhook.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{webhook.name}</p>
                          <Badge variant={webhook.active ? 'success' : 'secondary'}>
                            {webhook.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {webhook.url}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
