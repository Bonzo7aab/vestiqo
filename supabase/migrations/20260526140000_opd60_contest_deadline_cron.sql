-- OPD-60: Auto-advance contests from active → evaluation after submission deadline

CREATE OR REPLACE FUNCTION advance_contests_past_submission_deadline()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE tenders
  SET
    status = 'evaluation',
    updated_at = NOW()
  WHERE
    status = 'active'
    AND submission_deadline IS NOT NULL
    AND submission_deadline < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'advance_contests_past_submission_deadline',
  '0 * * * *',
  $$SELECT advance_contests_past_submission_deadline()$$
);
