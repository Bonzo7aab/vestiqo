-- OPD-148: matched-contest notification preference, contractor services gate flag,
-- GIN on service subcategory slugs, and RPC to find matching contractor user IDs.
-- Apply to vestiqo-test first. Do not apply to production without approval.

-- =============================================================================
-- 1. In-app preference (contractor, default ON)
-- =============================================================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS contractor_matched_contest_notifications BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.notification_preferences.contractor_matched_contest_notifications IS
  'OPD-148: in-app alerts when a published contest matches the contractor''s Usługi.';

-- =============================================================================
-- 2. Cheap middleware flag on user_profiles
-- =============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS contractor_services_completed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.contractor_services_completed IS
  'OPD-148: true once the contractor has saved at least one service subcategory.';

UPDATE public.user_profiles up
SET contractor_services_completed = true
WHERE up.user_type = 'contractor'
  AND up.contractor_services_completed = false
  AND EXISTS (
    SELECT 1
    FROM public.user_companies uc
    INNER JOIN public.companies c ON c.id = uc.company_id
    WHERE uc.user_id = up.id
      AND uc.is_active = true
      AND jsonb_typeof(c.metadata -> 'service_subcategory_slugs') = 'array'
      AND jsonb_array_length(c.metadata -> 'service_subcategory_slugs') > 0
  );

-- =============================================================================
-- 3. GIN for JSONB array membership (?|)
-- =============================================================================

CREATE INDEX IF NOT EXISTS companies_metadata_service_subcategory_slugs_gin
  ON public.companies
  USING gin ((metadata -> 'service_subcategory_slugs'));

-- =============================================================================
-- 4. Match RPC (service_role only — called from admin client)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.contractor_user_ids_matching_service_slugs(p_slugs text[])
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT uc.user_id
  FROM public.companies c
  INNER JOIN public.user_companies uc
    ON uc.company_id = c.id
   AND uc.is_active = true
  INNER JOIN public.user_profiles up
    ON up.id = uc.user_id
   AND up.user_type = 'contractor'
  LEFT JOIN public.notification_preferences np
    ON np.user_id = uc.user_id
  WHERE p_slugs IS NOT NULL
    AND cardinality(p_slugs) > 0
    AND jsonb_typeof(c.metadata -> 'service_subcategory_slugs') = 'array'
    AND (c.metadata -> 'service_subcategory_slugs') ?| p_slugs
    AND COALESCE(np.contractor_matched_contest_notifications, true);
$$;

REVOKE ALL ON FUNCTION public.contractor_user_ids_matching_service_slugs(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contractor_user_ids_matching_service_slugs(text[]) FROM anon;
REVOKE ALL ON FUNCTION public.contractor_user_ids_matching_service_slugs(text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_user_ids_matching_service_slugs(text[]) TO service_role;
