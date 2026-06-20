-- Contest status: Brak ofert — when submission deadline passed with zero submitted offers

ALTER TABLE public.contests DROP CONSTRAINT IF EXISTS contests_status_check;
ALTER TABLE public.contests DROP CONSTRAINT IF EXISTS tenders_status_check;

ALTER TABLE public.contests
  ADD CONSTRAINT contests_status_check CHECK (status IN (
    'draft', 'active', 'paused', 'evaluation', 'no_offers', 'awarded', 'cancelled'
  ));

CREATE OR REPLACE FUNCTION public.advance_contests_past_submission_deadline()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH offer_counts AS (
    SELECT
      c.id AS contest_id,
      COUNT(co.id) FILTER (
        WHERE co.status NOT IN ('draft', 'cancelled')
          AND (co.admin_moderation_status IS NULL OR co.admin_moderation_status <> 'suspended')
      )::INTEGER AS offers_count
    FROM public.contests c
    LEFT JOIN public.contest_offers co ON co.contest_id = c.id
    WHERE c.status IN ('active', 'evaluation')
      AND c.submission_deadline IS NOT NULL
      AND c.submission_deadline < NOW()
    GROUP BY c.id
  ),
  status_updates AS (
    UPDATE public.contests c
    SET
      status = CASE WHEN oc.offers_count > 0 THEN 'evaluation' ELSE 'no_offers' END,
      updated_at = NOW()
    FROM offer_counts oc
    WHERE c.id = oc.contest_id
      AND c.status IN ('active', 'evaluation')
      AND (
        (c.status = 'active' AND oc.offers_count >= 0)
        OR (c.status = 'evaluation' AND oc.offers_count = 0)
      )
    RETURNING c.id, c.manager_id, c.title, c.status,
      (SELECT oc2.offers_count FROM offer_counts oc2 WHERE oc2.contest_id = c.id) AS offers_count
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
      su.manager_id,
      'deadline_reminder'::public.notification_type,
      'Konkurs dobiegł końca',
      format(
        'Twój konkurs %s dobiegł końca! Liczba zebranych ofert: %s. Kliknij, aby otworzyć bezpieczną tabelę porównawczą i wygenerować protokół.',
        su.title,
        su.offers_count
      ),
      jsonb_build_object(
        'contestId', su.id,
        'tenderId', su.id,
        'title', su.title,
        'offersCount', su.offers_count
      ),
      format('/panel-zarzadcy/konkursy/porownaj/%s', su.id),
      'urgent'
    FROM status_updates su
    WHERE su.manager_id IS NOT NULL
      AND su.status = 'evaluation'
      AND su.offers_count > 0
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO updated_count FROM status_updates;

  RETURN updated_count;
END;
$func$;
