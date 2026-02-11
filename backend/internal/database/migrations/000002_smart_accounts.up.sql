-- Add wallet type and enforcement level to agents
ALTER TABLE agents ADD COLUMN wallet_type VARCHAR(20) NOT NULL DEFAULT 'eoa';
ALTER TABLE agents ADD COLUMN enforcement_level VARCHAR(20) NOT NULL DEFAULT 'advisory';

ALTER TABLE agents ADD CONSTRAINT chk_agents_wallet_type CHECK (wallet_type IN ('eoa', 'smart_account'));
ALTER TABLE agents ADD CONSTRAINT chk_agents_enforcement_level CHECK (enforcement_level IN ('advisory', 'enforced'));

-- Smart accounts table (ERC-4337 accounts linked to agents)
CREATE TABLE smart_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    account_address VARCHAR(42) NOT NULL,
    factory_address VARCHAR(42) NOT NULL,
    signer_address VARCHAR(42) NOT NULL,
    salt VARCHAR(66) NOT NULL,
    deployed BOOLEAN NOT NULL DEFAULT false,
    deploy_tx_hash VARCHAR(66),
    entrypoint_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_at TIMESTAMPTZ
);

CREATE INDEX idx_smart_accounts_agent_id ON smart_accounts(agent_id);
CREATE INDEX idx_smart_accounts_wallet_id ON smart_accounts(wallet_id);
CREATE INDEX idx_smart_accounts_account_address ON smart_accounts(account_address);

-- Enforcement events table (on-chain enforcement log)
CREATE TABLE enforcement_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    smart_account_id UUID REFERENCES smart_accounts(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_op_hash VARCHAR(66),
    action_type VARCHAR(100) NOT NULL,
    action_data JSONB,
    enforced BOOLEAN NOT NULL,
    reason TEXT,
    permission_id UUID REFERENCES permissions(id) ON DELETE SET NULL,
    block_number BIGINT,
    tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enforcement_events_agent_id ON enforcement_events(agent_id);
CREATE INDEX idx_enforcement_events_smart_account_id ON enforcement_events(smart_account_id);
CREATE INDEX idx_enforcement_events_created_at ON enforcement_events(created_at);
