export interface Agent {
  id: string
  wallet_id: string
  name: string
  description?: string
  agent_address?: string
  onchain_registry_id?: string
  status: 'active' | 'inactive' | 'deleted'
  wallet_type: 'eoa' | 'smart_account'
  enforcement_level: 'advisory' | 'enforced'
  smart_account_address?: string
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
  status: 'draft' | 'active' | 'revoked' | 'deleted'
  version: number
  onchain_hash?: string
  created_at: string
  updated_at: string
  activated_at?: string
  revoked_at?: string
}

export interface Permission {
  id: string
  wallet_id: string
  agent_id: string
  policy_id: string
  status: 'active' | 'revoked' | 'expired'
  onchain_token_id?: string
  valid_from: string
  valid_until?: string
  created_at: string
  revoked_at?: string
  minted_at?: string
}

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

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  key?: string
  created_at: string
  last_used_at?: string
}

export interface ValidateAction {
  type: string
  token?: string
  protocol?: string
  amount?: string
  chain?: number
  to?: string
  data?: Record<string, unknown>
}

export interface ValidateRequest {
  agent_id: string
  action: ValidateAction
}

export interface ValidateResponse {
  allowed: boolean
  reason?: string
  permission_id?: string
  policy_id?: string
  constraints?: Record<string, unknown>
  request_id: string
}
