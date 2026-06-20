-- OPD-41 (part 2): Contest deadline cron — notify managers when submission ends
-- Depends on: 20260620120000_opd41_in_app_notifications.sql (preference columns)
-- Requires: contests + contest_offers tables (rename_tenders_to_contests migration)

CREATE OR REPLACE FUNCTION public.advance_contests_past_submission_deadline()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH transitioned AS (
    UPDATE public.contests
    SET status = 'evaluation', updated_at = NOW()
    WHERE status = 'active'
      AND submission_deadline IS NOT NULL
      AND submission_deadline < NOW()
    RETURNING id, manager_id, title
  ),
  offer_counts AS (
    SELECT
      t.id AS contest_id,
      t.manager_id,
      t.title,
      COUNT(co.id)::INTEGER AS offers_count
    FROM transitioned t
    LEFT JOIN public.contest_offers co
      ON co.contest_id = t.id
      AND co.status IN ('submitted', 'under_review', 'shortlisted')
    GROUP BY t.id, t.manager_id, t.title
  ),
  _notify AS (
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      action_url,
      priority
    )
    SELECT
      oc.manager_id,
      'deadline_reminder'::public.notification_type,
      'Konkurs dobiegł końca',
      format(
        'Twój konkurs %s dobiegł końca! Liczba zebranych ofert: %s. Kliknij, aby otworzyć bezpieczną tabelę porównawczą i wygenerować protokół.',
        oc.title,
        oc.offers_count
      ),
      jsonb_build_object(
        'contestId', oc.contest_id,
        'tenderId', oc.contest_id,
        'title', oc.title,
        'offersCount', oc.offers_count
      ),
      format('/panel-zarzadcy/konkursy/porownaj/%s', oc.contest_id),
      'urgent'
    FROM offer_counts oc
    WHERE oc.manager_id IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO updated_count FROM transitioned;

  RETURN updated_count;
END;
$func$;

DO $do1$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'advance_contests_past_submission_deadline') THEN
    PERFORM cron.unschedule('advance_contests_past_submission_deadline');
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END
$do1$;

DO $do2$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'advance_contests_past_submission_deadline',
    '* * * * *',
    'SELECT public.advance_contests_past_submission_deadline()'
  );
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END
$do2$;
