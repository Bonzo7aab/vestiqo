-- OPD-118: Registry verification columns (CEIDG/KRS + finance status)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_form TEXT,
  ADD COLUMN IF NOT EXISTS registry_source TEXT,
  ADD COLUMN IF NOT EXISTS registry_status TEXT,
  ADD COLUMN IF NOT EXISTS registry_checked_at TIMESTAMPTZ;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_registry_source_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_registry_source_check
  CHECK (
    registry_source IS NULL
    OR registry_source IN ('ceidg', 'krs')
  );

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_registry_status_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_registry_status_check
  CHECK (
    registry_status IS NULL
    OR registry_status IN ('active', 'suspended', 'closed', 'unknown')
  );

COMMENT ON COLUMN public.companies.legal_form IS
  'Legal form label from CEIDG or KRS (e.g. JDG, sp. z o.o.)';

COMMENT ON COLUMN public.companies.registry_source IS
  'Authoritative registry used for business status: ceidg (JDG) or krs (companies)';

COMMENT ON COLUMN public.companies.registry_status IS
  'Normalized business registry status: active, suspended, closed, unknown';

COMMENT ON COLUMN public.companies.registry_checked_at IS
  'Timestamp of last CEIDG/KRS registry lookup';

ALTER TABLE public.contractor_account_settings
  ADD COLUMN IF NOT EXISTS finance_registry_status TEXT,
  ADD COLUMN IF NOT EXISTS finance_registry_checked_at TIMESTAMPTZ;

ALTER TABLE public.contractor_account_settings
  DROP CONSTRAINT IF EXISTS contractor_account_settings_finance_registry_status_check;

ALTER TABLE public.contractor_account_settings
  ADD CONSTRAINT contractor_account_settings_finance_registry_status_check
  CHECK (
    finance_registry_status IS NULL
    OR finance_registry_status IN ('solvent', 'insolvent', 'unknown')
  );

COMMENT ON COLUMN public.contractor_account_settings.finance_registry_status IS
  'Financial solvency from MF VAT + KRS insolvency proceedings';

COMMENT ON COLUMN public.contractor_account_settings.finance_registry_checked_at IS
  'Timestamp of last finance registry assessment';
