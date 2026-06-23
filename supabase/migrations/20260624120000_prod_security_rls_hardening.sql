-- Production security hardening: re-enable RLS, tighten policies, lock down RPCs.
-- See security audit plan (2026-06-24).

-- ---------------------------------------------------------------------------
-- 1. Re-enable RLS on tables left disabled after contractor seeding
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Drop overly broad companies SELECT policy (prod-only artifact)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view companies" ON public.companies;

-- ---------------------------------------------------------------------------
-- 3. Harden notifications INSERT (was WITH CHECK (true))
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR
    is_admin() OR
    user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 4. Tighten overly permissive SELECT policies
-- ---------------------------------------------------------------------------

-- Buildings: scope to public companies (no is_public on buildings table)
DROP POLICY IF EXISTS "Authenticated users can view public buildings" ON public.buildings;
CREATE POLICY "Authenticated users can view public buildings" ON public.buildings
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = buildings.company_id AND c.is_public = true
    )
  );

-- Certificates: scope to public companies
DROP POLICY IF EXISTS "Authenticated users can view public certificates" ON public.certificates;
CREATE POLICY "Authenticated users can view public certificates" ON public.certificates
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = certificates.company_id AND c.is_public = true
    )
  );

-- Portfolio projects: scope to public companies
DROP POLICY IF EXISTS "Authenticated users can view public portfolio projects" ON public.portfolio_projects;
CREATE POLICY "Authenticated users can view public portfolio projects" ON public.portfolio_projects
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = portfolio_projects.company_id AND c.is_public = true
    )
  );

-- Portfolio project images: require company membership or public company
DROP POLICY IF EXISTS "Users can view portfolio project images" ON public.portfolio_project_images;
CREATE POLICY "Users can view portfolio project images" ON public.portfolio_project_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_projects pp
      WHERE pp.id = portfolio_project_images.project_id
        AND (
          EXISTS (
            SELECT 1 FROM public.user_companies uc
            WHERE uc.company_id = pp.company_id AND uc.user_id = auth.uid()
          )
          OR (
            auth.role() = 'authenticated'
            AND EXISTS (
              SELECT 1 FROM public.companies c
              WHERE c.id = pp.company_id AND c.is_public = true
            )
          )
        )
    )
  );

-- Legacy tables (tender_id FK → contests)
DROP POLICY IF EXISTS "Users can view evaluation criteria" ON public.evaluation_criteria;
CREATE POLICY "Users can view evaluation criteria for accessible contests" ON public.evaluation_criteria
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.contests c
      WHERE c.id = evaluation_criteria.tender_id
        AND (c.is_public = true OR c.manager_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view tender documents" ON public.tender_documents;
CREATE POLICY "Users can view tender documents for accessible contests" ON public.tender_documents
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.contests c
      WHERE c.id = tender_documents.tender_id
        AND (c.is_public = true OR c.manager_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view reviews" ON public.reviews;
CREATE POLICY "Users can view reviews when authenticated" ON public.reviews
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 5. Require auth on contractor contest Q&A list; lock down cron RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_contest_questions_contractor(p_contest_id UUID)
RETURNS TABLE (
  id UUID,
  question TEXT,
  created_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  comments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contests c WHERE c.id = p_contest_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.question,
    q.created_at,
    q.answered_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', qc.id,
            'body', qc.body,
            'created_at', qc.created_at
          )
          ORDER BY qc.created_at ASC
        )
        FROM public.question_comments qc
        WHERE qc.question_id = q.id
      ),
      '[]'::JSONB
    ) AS comments
  FROM public.questions q
  WHERE q.contest_id = p_contest_id
    AND q.answered_at IS NOT NULL
  ORDER BY q.answered_at ASC;
END;
$$;

-- Cron/maintenance: service_role only
REVOKE EXECUTE ON FUNCTION public.advance_contests_past_submission_deadline() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.advance_contests_past_submission_deadline() TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_expired_jobs_to_inactive() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_expired_jobs_to_inactive() TO service_role;

-- Contest Q&A RPCs: authenticated only (not anon)
REVOKE EXECUTE ON FUNCTION public.list_contest_questions_contractor(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_contest_questions_manager(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_contest_question_comment(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.answer_contest_question(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_contest_question_comment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_unseen_contest_questions(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_contest_questions_seen(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_manage_contest(uuid) FROM PUBLIC, anon;

-- is_admin: not needed via RPC for anon
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_or_manages_company(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_contest_questions_contractor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_contest_questions_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_contest_question_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_contest_question(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contest_question_comment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unseen_contest_questions(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_contest_questions_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_contest(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_or_manages_company(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. budget_data_view: use security_invoker so jobs RLS applies
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.budget_data_view;

CREATE VIEW public.budget_data_view
  WITH (security_invoker = true) AS
SELECT
  id,
  title,
  jsonb_build_object(
    'min', budget_min,
    'max', budget_max,
    'type', budget_type,
    'currency', COALESCE(currency, 'PLN'::character varying)
  ) AS budget,
  budget_min,
  budget_max,
  budget_type,
  currency,
  CASE
    WHEN budget_type::text = 'negotiable'::text THEN 'Do negocjacji'::text
    WHEN budget_type::text = 'hourly'::text THEN
      ((COALESCE(budget_min::text, '0'::text) || ' '::text) || COALESCE(currency, 'PLN'::character varying)::text) || '/h'::text
    WHEN budget_max IS NOT NULL AND budget_max <> budget_min THEN
      (((COALESCE(budget_min::text, '0'::text) || ' - '::text) || budget_max::text) || ' '::text) || COALESCE(currency, 'PLN'::character varying)::text
    ELSE
      (COALESCE(budget_min::text, '0'::text) || ' '::text) || COALESCE(currency, 'PLN'::character varying)::text
  END AS budget_display,
  status,
  created_at
FROM public.jobs;
