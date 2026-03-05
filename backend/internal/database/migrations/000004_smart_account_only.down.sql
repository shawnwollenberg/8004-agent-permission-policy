ALTER TABLE agents DROP CONSTRAINT IF EXISTS chk_agents_wallet_type;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS chk_agents_enforcement_level;
ALTER TABLE agents ADD CONSTRAINT chk_agents_wallet_type CHECK (wallet_type IN ('eoa', 'smart_account'));
ALTER TABLE agents ADD CONSTRAINT chk_agents_enforcement_level CHECK (enforcement_level IN ('advisory', 'enforced'));
ALTER TABLE audit_logs DROP COLUMN IF EXISTS source;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS tx_hash;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS block_number;
DROP TABLE IF EXISTS indexer_state;
