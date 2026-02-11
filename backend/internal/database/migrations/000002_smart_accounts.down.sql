DROP TABLE IF EXISTS enforcement_events;
DROP TABLE IF EXISTS smart_accounts;

ALTER TABLE agents DROP CONSTRAINT IF EXISTS chk_agents_wallet_type;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS chk_agents_enforcement_level;
ALTER TABLE agents DROP COLUMN IF EXISTS enforcement_level;
ALTER TABLE agents DROP COLUMN IF EXISTS wallet_type;
