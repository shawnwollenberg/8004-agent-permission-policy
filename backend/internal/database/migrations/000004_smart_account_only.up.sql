-- Remove EOA support: update all existing agents to smart_account/enforced
UPDATE agents SET wallet_type = 'smart_account', enforcement_level = 'enforced';

-- Drop and recreate constraints to only allow smart_account/enforced
ALTER TABLE agents DROP CONSTRAINT IF EXISTS chk_agents_wallet_type;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS chk_agents_enforcement_level;
ALTER TABLE agents ADD CONSTRAINT chk_agents_wallet_type CHECK (wallet_type = 'smart_account');
ALTER TABLE agents ADD CONSTRAINT chk_agents_enforcement_level CHECK (enforcement_level = 'enforced');

-- Add on-chain event tracking fields to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'offchain';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(66);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS block_number BIGINT;
ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_source CHECK (source IN ('offchain', 'onchain'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs(source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tx_hash ON audit_logs(tx_hash);

-- Indexer state table for tracking last processed block per contract
CREATE TABLE IF NOT EXISTS indexer_state (
    id VARCHAR(100) PRIMARY KEY,
    last_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
