-- Link jobs to a managed WM/SM entity for contest/job location resolution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'managed_entity_id'
  ) THEN
    ALTER TABLE public.jobs
      ADD COLUMN managed_entity_id UUID REFERENCES public.managed_housing_entities(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_jobs_managed_entity_id ON public.jobs(managed_entity_id);
    RAISE NOTICE 'Added managed_entity_id to jobs';
  ELSE
    RAISE NOTICE 'managed_entity_id on jobs already exists';
  END IF;
END $$;
