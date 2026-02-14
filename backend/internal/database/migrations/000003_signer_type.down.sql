ALTER TABLE smart_accounts DROP CONSTRAINT IF EXISTS chk_signer_type;
ALTER TABLE smart_accounts DROP COLUMN IF EXISTS signer_type;
