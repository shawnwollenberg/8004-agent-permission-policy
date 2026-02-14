import { API_BASE_URL } from './wagmi'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_address')
      window.dispatchEvent(new Event('auth-expired'))
    }
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(response.status, error.error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Auth
export const auth = {
  getNonce: () => fetchApi<{ nonce: string }>('/api/v1/auth/nonce', { method: 'POST' }),
  verify: (message: string, signature: string) =>
    fetchApi<{ token: string; address: string }>('/api/v1/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    }),
}

// Agents
export interface Agent {
  id: string
  wallet_id: string
  name: string
  description?: string
  agent_address?: string
  onchain_registry_id?: string
  status: string
  wallet_type: 'eoa' | 'smart_account'
  enforcement_level: 'advisory' | 'enforced'
  smart_account_address?: string
  signer_address?: string
  created_at: string
  updated_at: string
  onchain_registered_at?: string
}

export interface SmartAccount {
  id: string
  agent_id: string
  wallet_id: string
  account_address: string
  factory_address: string
  signer_address: string
  salt: string
  deployed: boolean
  deploy_tx_hash?: string
  entrypoint_address: string
  chain_id: number
  created_at: string
  updated_at: string
  deployed_at?: string
}

export const agents = {
  list: () => fetchApi<Agent[]>('/api/v1/agents'),
  get: (id: string) => fetchApi<Agent>(`/api/v1/agents/${id}`),
  create: (data: { name: string; description?: string; agent_address?: string; wallet_type?: string }) =>
    fetchApi<Agent>('/api/v1/agents', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Agent>) =>
    fetchApi<Agent>(`/api/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<void>(`/api/v1/agents/${id}`, { method: 'DELETE' }),
  registerOnchain: (id: string) =>
    fetchApi<Agent>(`/api/v1/agents/${id}/register-onchain`, { method: 'POST' }),
  deploySmartAccount: (id: string, data: { signer_address: string }) =>
    fetchApi<SmartAccount>(`/api/v1/agents/${id}/deploy-smart-account`, { method: 'POST', body: JSON.stringify(data) }),
  getSmartAccount: (id: string) =>
    fetchApi<SmartAccount>(`/api/v1/agents/${id}/smart-account`),
  upgradeToSmartAccount: (id: string) =>
    fetchApi<SmartAccount>(`/api/v1/agents/${id}/upgrade-to-smart-account`, { method: 'POST' }),
}

// Policies
export interface PolicyDefinition {
  actions: string[]
  assets?: {
    tokens?: string[]
    protocols?: string[]
    chains?: number[]
  }
  constraints?: {
    maxValuePerTx?: string
    maxDailyVolume?: string
    maxWeeklyVolume?: string
    maxTxCount?: number
    requireApproval?: boolean
  }
  duration?: {
    validFrom?: string
    validUntil?: string
  }
  conditions?: Array<{
    field: string
    operator: string
    value: unknown
  }>
}

export interface Policy {
  id: string
  wallet_id: string
  name: string
  description?: string
  definition: PolicyDefinition
  status: string
  version: number
  onchain_hash?: string
  created_at: string
  updated_at: string
  activated_at?: string
  revoked_at?: string
}

export const policies = {
  list: () => fetchApi<Policy[]>('/api/v1/policies'),
  get: (id: string) => fetchApi<Policy>(`/api/v1/policies/${id}`),
  create: (data: { name: string; description?: string; definition: PolicyDefinition }) =>
    fetchApi<Policy>('/api/v1/policies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; description: string; definition: PolicyDefinition }>) =>
    fetchApi<Policy>(`/api/v1/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<void>(`/api/v1/policies/${id}`, { method: 'DELETE' }),
  activate: (id: string) => fetchApi<Policy>(`/api/v1/policies/${id}/activate`, { method: 'POST' }),
  revoke: (id: string) => fetchApi<Policy>(`/api/v1/policies/${id}/revoke`, { method: 'POST' }),
  reactivate: (id: string) => fetchApi<Policy>(`/api/v1/policies/${id}/reactivate`, { method: 'POST' }),
}

// Permissions
export interface Permission {
  id: string
  wallet_id: string
  agent_id: string
  policy_id: string
  status: string
  onchain_token_id?: string
  valid_from: string
  valid_until?: string
  created_at: string
  revoked_at?: string
  minted_at?: string
}

export const permissions = {
  list: (params?: { agent_id?: string; policy_id?: string }) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v != null && v !== '')
    )
    const query = new URLSearchParams(clean as Record<string, string>).toString()
    return fetchApi<Permission[]>(`/api/v1/permissions${query ? `?${query}` : ''}`)
  },
  get: (id: string) => fetchApi<Permission>(`/api/v1/permissions/${id}`),
  create: (data: { agent_id: string; policy_id: string; valid_from?: string; valid_until?: string }) =>
    fetchApi<Permission>('/api/v1/permissions', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<void>(`/api/v1/permissions/${id}`, { method: 'DELETE' }),
  mint: (id: string) => fetchApi<Permission>(`/api/v1/permissions/${id}/mint`, { method: 'POST' }),
}

// Validation
export interface ValidateRequest {
  agent_id: string
  action: {
    type: string
    token?: string
    protocol?: string
    amount?: string
    chain?: number
    to?: string
    data?: Record<string, unknown>
  }
}

export interface ValidateResponse {
  allowed: boolean
  reason?: string
  permission_id?: string
  policy_id?: string
  constraints?: Record<string, unknown>
  request_id: string
}

export const validation = {
  validate: (data: ValidateRequest) =>
    fetchApi<ValidateResponse>('/api/v1/validate', { method: 'POST', body: JSON.stringify(data) }),
  simulate: (data: ValidateRequest) =>
    fetchApi<{
      would_allow: boolean
      reason?: string
      matching_policy?: string
      current_usage?: Record<string, unknown>
      remaining_quota?: Record<string, unknown>
      recommendations?: string[]
    }>('/api/v1/validate/simulate', { method: 'POST', body: JSON.stringify(data) }),
}

// Audit
export interface AuditLog {
  id: string
  wallet_id: string
  agent_id?: string
  policy_id?: string
  permission_id?: string
  event_type: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export const audit = {
  list: (params?: {
    limit?: number
    offset?: number
    event_type?: string
    agent_id?: string
    policy_id?: string
    start_date?: string
    end_date?: string
  }) => {
    const clean = Object.fromEntries(
      Object.entries(params || {}).filter(([, v]) => v != null && v !== '')
    )
    const query = new URLSearchParams(clean as Record<string, string>).toString()
    return fetchApi<AuditLog[]>(`/api/v1/audit${query ? `?${query}` : ''}`)
  },
  export: (format: 'json' | 'csv', params?: { start_date?: string; end_date?: string }) => {
    const clean = Object.fromEntries(
      Object.entries({ format, ...params }).filter(([, v]) => v != null && v !== '')
    )
    const query = new URLSearchParams(clean as Record<string, string>).toString()
    return `${API_BASE_URL}/api/v1/audit/export?${query}`
  },
}

// Webhooks
export interface Webhook {
  id: string
  wallet_id: string
  name: string
  url: string
  secret?: string
  events: string[]
  active: boolean
  created_at: string
  updated_at: string
  last_call_at?: string
}

export const webhooks = {
  list: () => fetchApi<Webhook[]>('/api/v1/webhooks'),
  get: (id: string) => fetchApi<Webhook>(`/api/v1/webhooks/${id}`),
  create: (data: { name: string; url: string; events: string[] }) =>
    fetchApi<Webhook>('/api/v1/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; url: string; events: string[]; active: boolean }>) =>
    fetchApi<Webhook>(`/api/v1/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<void>(`/api/v1/webhooks/${id}`, { method: 'DELETE' }),
}

// API Keys
export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  key?: string
  created_at: string
  last_used_at?: string
}

export const apiKeys = {
  list: () => fetchApi<ApiKey[]>('/api/v1/api-keys'),
  create: (data: { name: string }) =>
    fetchApi<ApiKey>('/api/v1/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchApi<void>(`/api/v1/api-keys/${id}`, { method: 'DELETE' }),
}
