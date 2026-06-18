-- VAT whitelist (biała lista MF) verification metadata for contractor bank accounts

ALTER TABLE contractor_account_settings
  ADD COLUMN IF NOT EXISTS vat_whitelist_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vat_whitelist_account_assigned BOOLEAN,
  ADD COLUMN IF NOT EXISTS vat_whitelist_request_id TEXT,
  ADD COLUMN IF NOT EXISTS vat_whitelist_checked_for_date DATE;

COMMENT ON COLUMN contractor_account_settings.vat_whitelist_verified_at IS 'When the bank account was last checked against MF VAT whitelist';
COMMENT ON COLUMN contractor_account_settings.vat_whitelist_account_assigned IS 'Whether MF reported the account as assigned to the company NIP on checked_for_date';
COMMENT ON COLUMN contractor_account_settings.vat_whitelist_request_id IS 'MF API requestId from the whitelist check (audit proof)';
COMMENT ON COLUMN contractor_account_settings.vat_whitelist_checked_for_date IS 'Date (Europe/Warsaw) used in the MF whitelist query';
