ALTER TABLE smart_accounts ADD COLUMN signer_type VARCHAR(20) NOT NULL DEFAULT 'wallet';
ALTER TABLE smart_accounts ADD CONSTRAINT chk_signer_type CHECK (signer_type IN ('wallet', 'generated'));
