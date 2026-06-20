-- Rename tenders domain to contests (tables, columns, RLS, RPCs, triggers, enums)
-- Idempotent: safe to re-run on test/prod after partial apply.

-- =============================================================================
-- 1. Table renames
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.tenders') IS NOT NULL AND to_regclass('public.contests') IS NULL THEN
    ALTER TABLE public.tenders RENAME TO contests;
  END IF;
  IF to_regclass('public.tender_bids') IS NOT NULL AND to_regclass('public.contest_offers') IS NULL THEN
    ALTER TABLE public.tender_bids RENAME TO contest_offers;
  END IF;
END $$;

-- =============================================================================
-- 2. Column renames
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.contests') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contests' AND column_name = 'winning_bid_id'
    ) THEN
      ALTER TABLE public.contests RENAME COLUMN winning_bid_id TO winning_offer_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contests' AND column_name = 'bids_count'
    ) THEN
      ALTER TABLE public.contests RENAME COLUMN bids_count TO offers_count;
    END IF;
  END IF;

  IF to_regclass('public.contest_offers') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contest_offers' AND column_name = 'tender_id'
    ) THEN
      ALTER TABLE public.contest_offers RENAME COLUMN tender_id TO contest_id;
    END IF;
  END IF;

  IF to_regclass('public.questions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'tender_id'
    ) THEN
      ALTER TABLE public.questions RENAME COLUMN tender_id TO contest_id;
    END IF;
  END IF;

  IF to_regclass('public.conversations') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'tender_id'
    ) THEN
      ALTER TABLE public.conversations RENAME COLUMN tender_id TO contest_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'bid_id'
    ) THEN
      ALTER TABLE public.conversations RENAME COLUMN bid_id TO contest_offer_id;
    END IF;
  END IF;

  IF to_regclass('public.company_reviews') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'company_reviews' AND column_name = 'tender_id'
    ) THEN
      ALTER TABLE public.company_reviews RENAME COLUMN tender_id TO contest_id;
    END IF;
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tender_id'
    ) THEN
      ALTER TABLE public.orders RENAME COLUMN tender_id TO contest_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tender_bid_id'
    ) THEN
      ALTER TABLE public.orders RENAME COLUMN tender_bid_id TO contest_offer_id;
    END IF;
  END IF;
END $$;

-- Index renames (best-effort)
ALTER INDEX IF EXISTS idx_tenders_category RENAME TO idx_contests_category;
ALTER INDEX IF EXISTS idx_tenders_manager RENAME TO idx_contests_manager;
ALTER INDEX IF EXISTS idx_tenders_status RENAME TO idx_contests_status;
ALTER INDEX IF EXISTS idx_tenders_deadline RENAME TO idx_contests_deadline;
ALTER INDEX IF EXISTS idx_tenders_building_id RENAME TO idx_contests_building_id;
ALTER INDEX IF EXISTS idx_tenders_subcategory_id RENAME TO idx_contests_subcategory_id;
ALTER INDEX IF EXISTS idx_tenders_location RENAME TO idx_contests_location;
ALTER INDEX IF EXISTS idx_tenders_coordinates RENAME TO idx_contests_coordinates;
ALTER INDEX IF EXISTS idx_tender_bids_tender RENAME TO idx_contest_offers_contest;
ALTER INDEX IF EXISTS idx_tender_bids_contractor RENAME TO idx_contest_offers_contractor;
ALTER INDEX IF EXISTS idx_tender_bids_status RENAME TO idx_contest_offers_status;
ALTER INDEX IF EXISTS idx_tender_bids_one_draft_per_company RENAME TO idx_contest_offers_one_draft_per_company;
ALTER INDEX IF EXISTS idx_questions_tender_unseen RENAME TO idx_questions_contest_unseen;
ALTER INDEX IF EXISTS idx_orders_tender_id RENAME TO idx_orders_contest_id;
ALTER INDEX IF EXISTS idx_company_reviews_reviewer_tender RENAME TO idx_company_reviews_reviewer_contest;

-- =============================================================================
-- 3. Drop legacy RLS policies (old names on renamed tables)
-- =============================================================================

DO $$
BEGIN
  IF to_regclass('public.contests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can view public tenders" ON public.contests;
    DROP POLICY IF EXISTS "Users can view their own tenders" ON public.contests;
    DROP POLICY IF EXISTS "Users can insert tenders" ON public.contests;
    DROP POLICY IF EXISTS "Users can update their own tenders" ON public.contests;
    DROP POLICY IF EXISTS "Users can delete their own tenders" ON public.contests;
    DROP POLICY IF EXISTS "Platform admins full access tenders" ON public.contests;
    DROP POLICY IF EXISTS "Authenticated users can view public contests" ON public.contests;
    DROP POLICY IF EXISTS "Users can view their own contests" ON public.contests;
    DROP POLICY IF EXISTS "Users can insert contests" ON public.contests;
    DROP POLICY IF EXISTS "Users can update their own contests" ON public.contests;
    DROP POLICY IF EXISTS "Users can delete their own contests" ON public.contests;
    DROP POLICY IF EXISTS "Platform admins full access contests" ON public.contests;

    CREATE POLICY "Authenticated users can view public contests" ON public.contests
      FOR SELECT USING (auth.role() = 'authenticated' AND is_public = true);
    CREATE POLICY "Users can view their own contests" ON public.contests
      FOR SELECT USING (manager_id = auth.uid());
    CREATE POLICY "Users can insert contests" ON public.contests
      FOR INSERT WITH CHECK (manager_id = auth.uid());
    CREATE POLICY "Users can update their own contests" ON public.contests
      FOR UPDATE USING (manager_id = auth.uid());
    CREATE POLICY "Users can delete their own contests" ON public.contests
      FOR DELETE USING (manager_id = auth.uid());
    CREATE POLICY "Platform admins full access contests" ON public.contests
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid() AND up.user_type = 'admin'
        )
      );
  END IF;

  IF to_regclass('public.contest_offers') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own bids" ON public.contest_offers;
    DROP POLICY IF EXISTS "Tender owners can view bids" ON public.contest_offers;
    DROP POLICY IF EXISTS "Users can submit bids" ON public.contest_offers;
    DROP POLICY IF EXISTS "Tender owners can update bid status" ON public.contest_offers;
    DROP POLICY IF EXISTS "Contractors can cancel their own bids" ON public.contest_offers;
    DROP POLICY IF EXISTS "Platform admins full access tender_bids" ON public.contest_offers;
    DROP POLICY IF EXISTS "Contest owners can view offers" ON public.contest_offers;
    DROP POLICY IF EXISTS "Contest owners can update offer status" ON public.contest_offers;
    DROP POLICY IF EXISTS "Users can submit contest offers" ON public.contest_offers;
    DROP POLICY IF EXISTS "Platform admins full access contest_offers" ON public.contest_offers;

    CREATE POLICY "Users can view their own bids" ON public.contest_offers
      FOR SELECT USING (contractor_id = auth.uid());
    CREATE POLICY "Contest owners can view offers" ON public.contest_offers
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.contests c
          WHERE c.id = contest_offers.contest_id AND c.manager_id = auth.uid()
        )
      );
    CREATE POLICY "Users can submit contest offers" ON public.contest_offers
      FOR INSERT WITH CHECK (contractor_id = auth.uid());
    CREATE POLICY "Contest owners can update offer status" ON public.contest_offers
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.contests c
          WHERE c.id = contest_offers.contest_id AND c.manager_id = auth.uid()
        )
      );
    CREATE POLICY "Contractors can cancel their own bids" ON public.contest_offers
      FOR UPDATE USING (contractor_id = auth.uid())
      WITH CHECK (contractor_id = auth.uid());
    CREATE POLICY "Platform admins full access contest_offers" ON public.contest_offers
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.id = auth.uid() AND up.user_type = 'admin'
        )
      );
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Managers can insert orders for their tenders" ON public.orders;
    CREATE POLICY "Managers can insert orders for their contests" ON public.orders
      FOR INSERT WITH CHECK (
        manager_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.contests c
          WHERE c.id = orders.contest_id
            AND c.manager_id = auth.uid()
            AND c.company_id = orders.manager_company_id
        )
      );
  END IF;
END $$;

-- =============================================================================
-- 4. Offers count trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_contest_offers_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.contests
  SET offers_count = (
    SELECT COUNT(*)
    FROM public.contest_offers
    WHERE contest_id = COALESCE(NEW.contest_id, OLD.contest_id)
      AND status NOT IN ('cancelled', 'draft')
  )
  WHERE id = COALESCE(NEW.contest_id, OLD.contest_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tender_bids_count_on_insert ON public.contest_offers;
DROP TRIGGER IF EXISTS update_tender_bids_count_on_update ON public.contest_offers;
DROP TRIGGER IF EXISTS update_tender_bids_count_on_delete ON public.contest_offers;
DROP TRIGGER IF EXISTS update_contest_offers_count_on_insert ON public.contest_offers;
DROP TRIGGER IF EXISTS update_contest_offers_count_on_update ON public.contest_offers;
DROP TRIGGER IF EXISTS update_contest_offers_count_on_delete ON public.contest_offers;

CREATE TRIGGER update_contest_offers_count_on_insert
  AFTER INSERT ON public.contest_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_contest_offers_count();

CREATE TRIGGER update_contest_offers_count_on_update
  AFTER UPDATE ON public.contest_offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.contest_id IS DISTINCT FROM NEW.contest_id)
  EXECUTE FUNCTION public.update_contest_offers_count();

CREATE TRIGGER update_contest_offers_count_on_delete
  AFTER DELETE ON public.contest_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_contest_offers_count();

DROP FUNCTION IF EXISTS public.update_tender_bids_count();

-- Recreate draft unique index with new column name
DROP INDEX IF EXISTS public.idx_contest_offers_one_draft_per_company;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_offers_one_draft_per_company
  ON public.contest_offers (contest_id, company_id)
  WHERE status = 'draft';

-- =============================================================================
-- 5. Contest deadline cron
-- =============================================================================

CREATE OR REPLACE FUNCTION public.advance_contests_past_submission_deadline()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.contests
  SET status = 'evaluation', updated_at = NOW()
  WHERE status = 'active'
    AND submission_deadline IS NOT NULL
    AND submission_deadline < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance_contests_past_submission_deadline') THEN
    PERFORM cron.unschedule('advance_contests_past_submission_deadline');
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'advance_contests_past_submission_deadline',
    '0 * * * *',
    $$SELECT public.advance_contests_past_submission_deadline()$$
  );
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 6. RPCs — user_can_manage_contest + Q&A
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_can_manage_contest(p_contest_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contests c
    WHERE c.id = p_contest_id
      AND (
        c.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.user_companies uc
          WHERE uc.company_id = c.company_id
            AND uc.user_id = auth.uid()
            AND uc.is_active = TRUE
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_contest(UUID) TO authenticated;

-- Drop policies that depend on user_can_manage_contest_tender before dropping the function
DROP POLICY IF EXISTS "Managers can view questions on their tenders" ON public.questions;
DROP POLICY IF EXISTS "Managers can view questions on their contests" ON public.questions;
DROP POLICY IF EXISTS "Job/tender owners can answer questions" ON public.questions;
DROP POLICY IF EXISTS "Job/contest owners can answer questions" ON public.questions;
DROP POLICY IF EXISTS "Managers can view comments on manageable contest questions" ON public.question_comments;
DROP POLICY IF EXISTS "Managers can insert comments on manageable contest questions" ON public.question_comments;
DROP POLICY IF EXISTS "Managers can update own comments on manageable questions" ON public.question_comments;
DROP POLICY IF EXISTS "Managers can delete own comments on manageable questions" ON public.question_comments;

DROP FUNCTION IF EXISTS public.user_can_manage_contest_tender(UUID);

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

CREATE OR REPLACE FUNCTION public.list_contest_questions_manager(p_contest_id UUID)
RETURNS TABLE (
  id UUID,
  question TEXT,
  created_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  asker_id UUID,
  asker_display_name TEXT,
  company_name TEXT,
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

  IF NOT public.user_can_manage_contest(p_contest_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.question,
    q.created_at,
    q.answered_at,
    q.asker_id,
    TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')) AS asker_display_name,
    c.name::TEXT AS company_name,
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
  JOIN public.user_profiles up ON up.id = q.asker_id
  LEFT JOIN public.user_companies uc ON uc.user_id = q.asker_id AND uc.is_primary = TRUE
  LEFT JOIN public.companies c ON c.id = uc.company_id
  WHERE q.contest_id = p_contest_id
  ORDER BY q.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.answer_contest_question(p_question_id UUID, p_answer TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contest_id UUID;
  v_question_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF TRIM(COALESCE(p_answer, '')) = '' THEN
    RAISE EXCEPTION 'Answer required';
  END IF;

  SELECT q.contest_id, q.id INTO v_contest_id, v_question_id
  FROM public.questions q
  WHERE q.id = p_question_id AND q.contest_id IS NOT NULL;

  IF v_question_id IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  IF NOT public.user_can_manage_contest(v_contest_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.questions
  SET
    answer = TRIM(p_answer),
    answered_by = auth.uid(),
    answered_at = NOW(),
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN p_question_id;
END;
$$;

DROP FUNCTION IF EXISTS public.count_unseen_contest_questions(UUID[]);

CREATE OR REPLACE FUNCTION public.count_unseen_contest_questions(p_contest_ids UUID[])
RETURNS TABLE (contest_id UUID, unseen_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT q.contest_id, COUNT(*)::BIGINT
  FROM public.questions q
  WHERE q.contest_id = ANY(p_contest_ids)
    AND public.user_can_manage_contest(q.contest_id)
    AND q.answered_at IS NULL
    AND q.manager_seen_at IS NULL
  GROUP BY q.contest_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_contest_questions_seen(p_contest_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_contest(p_contest_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.questions q
  SET manager_seen_at = NOW(), updated_at = NOW()
  WHERE q.contest_id = p_contest_id
    AND q.manager_seen_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_contest_question_comment(p_question_id UUID, p_body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contest_id UUID;
  v_comment_id UUID;
  v_trimmed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_trimmed := TRIM(COALESCE(p_body, ''));
  IF v_trimmed = '' THEN
    RAISE EXCEPTION 'Comment required';
  END IF;

  SELECT q.contest_id INTO v_contest_id
  FROM public.questions q
  WHERE q.id = p_question_id AND q.contest_id IS NOT NULL;

  IF v_contest_id IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  IF NOT public.user_can_manage_contest(v_contest_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.question_comments (question_id, author_id, body)
  VALUES (p_question_id, auth.uid(), v_trimmed)
  RETURNING id INTO v_comment_id;

  UPDATE public.questions
  SET
    answer = CASE WHEN answered_at IS NULL THEN v_trimmed ELSE answer END,
    answered_by = CASE WHEN answered_at IS NULL THEN auth.uid() ELSE answered_by END,
    answered_at = COALESCE(answered_at, NOW()),
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN v_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_contest_question_comment(p_comment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id UUID;
  v_contest_id UUID;
  v_latest_body TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT qc.question_id, q.contest_id
  INTO v_question_id, v_contest_id
  FROM public.question_comments qc
  JOIN public.questions q ON q.id = qc.question_id
  WHERE qc.id = p_comment_id
    AND qc.author_id = auth.uid()
    AND q.contest_id IS NOT NULL;

  IF v_question_id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  IF NOT public.user_can_manage_contest(v_contest_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.question_comments WHERE id = p_comment_id;

  SELECT qc.body
  INTO v_latest_body
  FROM public.question_comments qc
  WHERE qc.question_id = v_question_id
  ORDER BY qc.created_at DESC
  LIMIT 1;

  IF v_latest_body IS NULL THEN
    UPDATE public.questions
    SET answer = NULL, answered_by = NULL, answered_at = NULL, updated_at = NOW()
    WHERE id = v_question_id;
  ELSE
    UPDATE public.questions
    SET answer = v_latest_body, updated_at = NOW()
    WHERE id = v_question_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_contest_questions_contractor(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_contest_questions_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.answer_contest_question(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unseen_contest_questions(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_contest_questions_seen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_contest_question_comment(UUID, TEXT) TO authenticated;

-- Question / comment RLS using new helper
DROP POLICY IF EXISTS "Managers can view questions on their tenders" ON public.questions;
DROP POLICY IF EXISTS "Managers can view questions on their contests" ON public.questions;
CREATE POLICY "Managers can view questions on their contests" ON public.questions
  FOR SELECT USING (
    contest_id IS NOT NULL AND public.user_can_manage_contest(contest_id)
  );

DROP POLICY IF EXISTS "Job/tender owners can answer questions" ON public.questions;
DROP POLICY IF EXISTS "Job/contest owners can answer questions" ON public.questions;
CREATE POLICY "Job/contest owners can answer questions" ON public.questions
  FOR UPDATE USING (
    answered_by = auth.uid()
    OR (
      contest_id IS NOT NULL AND public.user_can_manage_contest(contest_id)
    )
    OR (
      job_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = questions.job_id AND j.manager_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Managers can view comments on manageable contest questions" ON public.question_comments;
CREATE POLICY "Managers can view comments on manageable contest questions" ON public.question_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_comments.question_id
        AND q.contest_id IS NOT NULL
        AND public.user_can_manage_contest(q.contest_id)
    )
  );

DROP POLICY IF EXISTS "Managers can insert comments on manageable contest questions" ON public.question_comments;
CREATE POLICY "Managers can insert comments on manageable contest questions" ON public.question_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_comments.question_id
        AND q.contest_id IS NOT NULL
        AND public.user_can_manage_contest(q.contest_id)
    )
  );

DROP POLICY IF EXISTS "Managers can update own comments on manageable questions" ON public.question_comments;
CREATE POLICY "Managers can update own comments on manageable questions" ON public.question_comments
  FOR UPDATE
  USING (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_comments.question_id
        AND q.contest_id IS NOT NULL
        AND public.user_can_manage_contest(q.contest_id)
    )
  )
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_comments.question_id
        AND q.contest_id IS NOT NULL
        AND public.user_can_manage_contest(q.contest_id)
    )
  );

DROP POLICY IF EXISTS "Managers can delete own comments on manageable questions" ON public.question_comments;
CREATE POLICY "Managers can delete own comments on manageable questions" ON public.question_comments
  FOR DELETE
  USING (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_comments.question_id
        AND q.contest_id IS NOT NULL
        AND public.user_can_manage_contest(q.contest_id)
    )
  );

-- =============================================================================
-- 7. Bookmark enum: job | contest only
-- =============================================================================

UPDATE public.bookmarks SET entity_type = 'contest' WHERE entity_type = 'tender';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'bookmark_entity_type' AND e.enumlabel = 'tender'
  ) THEN
    CREATE TYPE public.bookmark_entity_type_new AS ENUM ('job', 'contest');
    ALTER TABLE public.bookmarks
      ALTER COLUMN entity_type TYPE public.bookmark_entity_type_new
      USING entity_type::text::public.bookmark_entity_type_new;
    DROP TYPE public.bookmark_entity_type;
    ALTER TYPE public.bookmark_entity_type_new RENAME TO bookmark_entity_type;
  END IF;
END $$;

-- =============================================================================
-- 8. Notification enum + preferences
-- =============================================================================

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'new_contest';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'contest_awarded';

UPDATE public.notifications SET type = 'new_contest' WHERE type = 'new_tender';
UPDATE public.notifications SET type = 'contest_awarded' WHERE type = 'tender_awarded';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_preferences'
      AND column_name = 'new_tender_notifications'
  ) THEN
    ALTER TABLE public.notification_preferences
      RENAME COLUMN new_tender_notifications TO new_contest_notifications;
  END IF;
END $$;

-- Backfill notification JSON keys for in-app links
UPDATE public.notifications
SET data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('contestId', data->>'tenderId'))
WHERE data ? 'tenderId' AND NOT (data ? 'contestId');

UPDATE public.notifications
SET data = (COALESCE(data, '{}'::jsonb) || jsonb_build_object('contestId', data->>'tender_id'))
WHERE data ? 'tender_id' AND NOT (data ? 'contestId');

-- =============================================================================
-- 9. Backfill offers_count
-- =============================================================================

UPDATE public.contests c
SET offers_count = (
  SELECT COUNT(*)
  FROM public.contest_offers o
  WHERE o.contest_id = c.id
    AND o.status NOT IN ('cancelled', 'draft')
);

-- Rename updated_at trigger on contests table
DO $$
BEGIN
  IF to_regclass('public.contests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS update_tenders_updated_at ON public.contests;
    DROP TRIGGER IF EXISTS update_contests_updated_at ON public.contests;
    CREATE TRIGGER update_contests_updated_at
      BEFORE UPDATE ON public.contests
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
