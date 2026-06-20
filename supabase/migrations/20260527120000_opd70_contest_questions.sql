-- OPD-70: Contest Q&A (anonymous contractor view, manager answer workflow)

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  asker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  answer TEXT,
  answered_by UUID REFERENCES user_profiles(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT questions_job_or_tender CHECK (
    (job_id IS NOT NULL AND tender_id IS NULL) OR (job_id IS NULL AND tender_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_questions_job ON questions(job_id);
CREATE INDEX IF NOT EXISTS idx_questions_tender ON questions(tender_id);
CREATE INDEX IF NOT EXISTS idx_questions_asker ON questions(asker_id);
CREATE INDEX IF NOT EXISTS idx_questions_tender_answered ON questions(tender_id, answered_at);

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view public questions" ON questions;
DROP POLICY IF EXISTS "Users can view their own questions" ON questions;
DROP POLICY IF EXISTS "Users can view questions for their jobs/tenders" ON questions;
DROP POLICY IF EXISTS "Users can insert questions" ON questions;
DROP POLICY IF EXISTS "Users can update their own questions" ON questions;
DROP POLICY IF EXISTS "Job/tender owners can answer questions" ON questions;

CREATE POLICY "Users can view their own questions" ON questions
  FOR SELECT USING (asker_id = auth.uid());

CREATE POLICY "Managers can view questions on their tenders" ON questions
  FOR SELECT USING (
    tender_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tenders t
      WHERE t.id = questions.tender_id AND t.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view questions on their jobs" ON questions
  FOR SELECT USING (
    job_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = questions.job_id AND j.manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions" ON questions
  FOR INSERT WITH CHECK (asker_id = auth.uid());

CREATE POLICY "Users can update their own questions" ON questions
  FOR UPDATE USING (asker_id = auth.uid());

CREATE POLICY "Job/tender owners can answer questions" ON questions
  FOR UPDATE USING (
    answered_by = auth.uid() OR
    (job_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM jobs j WHERE j.id = questions.job_id AND j.manager_id = auth.uid()
    )) OR
    (tender_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM tenders t WHERE t.id = questions.tender_id AND t.manager_id = auth.uid()
    ))
  );

-- Published Q&A for contractors (no asker identity)
CREATE OR REPLACE FUNCTION list_contest_questions_contractor(p_tender_id UUID)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenders t WHERE t.id = p_tender_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT q.id, q.question, q.answer, q.created_at, q.answered_at
  FROM questions q
  WHERE q.tender_id = p_tender_id
    AND q.answered_at IS NOT NULL
    AND q.answer IS NOT NULL
  ORDER BY q.answered_at ASC;
END;
$$;

-- All Q&A for contest manager (with asker identity)
CREATE OR REPLACE FUNCTION list_contest_questions_manager(p_tender_id UUID)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  asker_id UUID,
  asker_display_name TEXT,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM tenders t
    WHERE t.id = p_tender_id AND t.manager_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.question,
    q.answer,
    q.created_at,
    q.answered_at,
    q.asker_id,
    TRIM(COALESCE(up.first_name, '') || ' ' || COALESCE(up.last_name, '')) AS asker_display_name,
    c.name::TEXT AS company_name
  FROM questions q
  JOIN user_profiles up ON up.id = q.asker_id
  LEFT JOIN user_companies uc ON uc.user_id = q.asker_id AND uc.is_primary = TRUE
  LEFT JOIN companies c ON c.id = uc.company_id
  WHERE q.tender_id = p_tender_id
  ORDER BY q.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION answer_contest_question(p_question_id UUID, p_answer TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tender_id UUID;
  v_question_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF TRIM(COALESCE(p_answer, '')) = '' THEN
    RAISE EXCEPTION 'Answer required';
  END IF;

  SELECT q.tender_id, q.id INTO v_tender_id, v_question_id
  FROM questions q
  WHERE q.id = p_question_id AND q.tender_id IS NOT NULL;

  IF v_question_id IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM tenders t
    WHERE t.id = v_tender_id AND t.manager_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE questions
  SET
    answer = TRIM(p_answer),
    answered_by = auth.uid(),
    answered_at = NOW(),
    updated_at = NOW()
  WHERE id = p_question_id;

  RETURN p_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION list_contest_questions_contractor(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_contest_questions_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION answer_contest_question(UUID, TEXT) TO authenticated;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'contest_question';
