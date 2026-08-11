-- OPD-152: Public WM/SM profile bookmarks + browse RLS for managed_housing_entities
-- Test: apply to vestiqo-test (hcnoqbnschbsxsjrbxao). Prod: pending approval.

-- 1. Allow bookmarking managed housing entities (Wspólnota / Spółdzielnia)
ALTER TYPE public.bookmark_entity_type ADD VALUE IF NOT EXISTS 'managed_housing_entity';

-- 2. Public SELECT for entity profiles (anon + authenticated), matching public contest browse
DROP POLICY IF EXISTS "Authenticated users can view public managed housing entities"
  ON public.managed_housing_entities;

DROP POLICY IF EXISTS "Anyone can view public managed housing entities"
  ON public.managed_housing_entities;

CREATE POLICY "Anyone can view public managed housing entities"
  ON public.managed_housing_entities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = managed_housing_entities.manager_company_id
        AND c.is_public = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.contests ct
      WHERE ct.managed_entity_id = managed_housing_entities.id
        AND ct.is_public = true
        AND ct.status IS DISTINCT FROM 'draft'
    )
  );
