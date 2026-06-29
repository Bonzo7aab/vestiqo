-- Restore public read of published contest Q&A (OPD-70).
-- 20260624120000_prod_security_rls_hardening revoked anon EXECUTE and required auth.uid(),
-- which breaks "Pytania i odpowiedzi" for visitors (42501 permission denied).
-- This RPC returns only answered questions without asker identity — safe for anon.

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

REVOKE EXECUTE ON FUNCTION public.list_contest_questions_contractor(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_contest_questions_contractor(UUID) TO anon, authenticated;
