-- contests.managed_entity_id (replaces building_id)
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
    RAISE NOTICE 'Neither contests nor tenders table found — skipping';
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS managed_entity_id UUID REFERENCES public.managed_housing_entities(id) ON DELETE SET NULL',
    contests_table
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_managed_entity_id ON public.%I (managed_entity_id)',
    contests_table, contests_table
  );
END $$;
