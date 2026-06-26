-- WM/SM management: replace buildings with managed_housing_entities

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Create managed_housing_entities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.managed_housing_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('wspólnota', 'spółdzielnia')),
  nip VARCHAR(10) NOT NULL,
  regon VARCHAR(14),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(10),
  bank_account_iban TEXT,
  vat_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (manager_company_id, nip)
);

CREATE INDEX IF NOT EXISTS idx_managed_housing_entities_manager_company_id
  ON public.managed_housing_entities (manager_company_id);

CREATE INDEX IF NOT EXISTS idx_managed_housing_entities_nip
  ON public.managed_housing_entities (nip);

ALTER TABLE public.managed_housing_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company managed housing entities" ON public.managed_housing_entities;
CREATE POLICY "Users can view company managed housing entities" ON public.managed_housing_entities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.company_id = managed_housing_entities.manager_company_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view public managed housing entities" ON public.managed_housing_entities;
CREATE POLICY "Authenticated users can view public managed housing entities" ON public.managed_housing_entities
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = managed_housing_entities.manager_company_id
        AND c.is_public = true
    )
  );

DROP POLICY IF EXISTS "Users can insert company managed housing entities" ON public.managed_housing_entities;
CREATE POLICY "Users can insert company managed housing entities" ON public.managed_housing_entities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.company_id = managed_housing_entities.manager_company_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update company managed housing entities" ON public.managed_housing_entities;
CREATE POLICY "Users can update company managed housing entities" ON public.managed_housing_entities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.company_id = managed_housing_entities.manager_company_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete company managed housing entities" ON public.managed_housing_entities;
CREATE POLICY "Users can delete company managed housing entities" ON public.managed_housing_entities
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.company_id = managed_housing_entities.manager_company_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP TRIGGER IF EXISTS update_managed_housing_entities_updated_at ON public.managed_housing_entities;
CREATE TRIGGER update_managed_housing_entities_updated_at
  BEFORE UPDATE ON public.managed_housing_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. contests: building_id -> managed_entity_id
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  contests_table text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contests'
  ) THEN
    contests_table := 'contests';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenders'
  ) THEN
    contests_table := 'tenders';
  ELSE
    RAISE EXCEPTION 'Neither contests nor tenders table found';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS tenders_building_id_fkey',
    contests_table
  );
  EXECUTE format(
    'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS contests_building_id_fkey',
    contests_table
  );
  EXECUTE format(
    'DROP INDEX IF EXISTS public.idx_contests_building_id'
  );
  EXECUTE format(
    'DROP INDEX IF EXISTS public.idx_tenders_building_id'
  );
  EXECUTE format(
    'ALTER TABLE public.%I DROP COLUMN IF EXISTS building_id',
    contests_table
  );
  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS managed_entity_id UUID REFERENCES public.managed_housing_entities(id) ON DELETE SET NULL',
    contests_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_managed_entity_id ON public.%I (managed_entity_id)',
    contests_table, contests_table
  );
END $$;

-- ---------------------------------------------------------------------------
-- 3. jobs: building_id -> managed_entity_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_building_id_fkey;
DROP INDEX IF EXISTS public.idx_jobs_building_id;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS building_id;
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS managed_entity_id UUID REFERENCES public.managed_housing_entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_managed_entity_id ON public.jobs (managed_entity_id);

-- ---------------------------------------------------------------------------
-- 4. Drop buildings table
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.buildings CASCADE;

COMMIT;
