-- OPD-189: public contest page shows "0 ofert" after offers were submitted.
--
-- update_contest_offers_count() runs as the contractor who inserted the offer.
-- It updates contests.offers_count, but contests UPDATE RLS allows only the
-- contest owner, so the update changes 0 rows and the counter stays at 0.
-- The same invoker role can only see its own contest_offers rows, so a count
-- taken inside the trigger would be wrong even if the update were allowed.
--
-- Recompute the counter in a private-schema SECURITY DEFINER function and
-- backfill contests that drifted. Apply to vestiqo-test first. Do not apply
-- to production without approval.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated;

CREATE OR REPLACE FUNCTION private.update_contest_offers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_ids uuid[];
  target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_ids := ARRAY[OLD.contest_id];
  ELSIF TG_OP = 'UPDATE' AND OLD.contest_id IS DISTINCT FROM NEW.contest_id THEN
    target_ids := ARRAY[NEW.contest_id, OLD.contest_id];
  ELSE
    target_ids := ARRAY[NEW.contest_id];
  END IF;

  FOREACH target_id IN ARRAY target_ids LOOP
    IF target_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.contests
    SET offers_count = (
      SELECT COUNT(*)
      FROM public.contest_offers
      WHERE contest_id = target_id
        AND status NOT IN ('cancelled', 'draft')
    )
    WHERE id = target_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.update_contest_offers_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.update_contest_offers_count() TO postgres, service_role, authenticated;

DROP TRIGGER IF EXISTS update_contest_offers_count_on_insert ON public.contest_offers;
DROP TRIGGER IF EXISTS update_contest_offers_count_on_update ON public.contest_offers;
DROP TRIGGER IF EXISTS update_contest_offers_count_on_delete ON public.contest_offers;
DROP TRIGGER IF EXISTS update_tender_bids_count_on_insert ON public.contest_offers;
DROP TRIGGER IF EXISTS update_tender_bids_count_on_update ON public.contest_offers;
DROP TRIGGER IF EXISTS update_tender_bids_count_on_delete ON public.contest_offers;

CREATE TRIGGER update_contest_offers_count_on_insert
  AFTER INSERT ON public.contest_offers
  FOR EACH ROW
  EXECUTE FUNCTION private.update_contest_offers_count();

CREATE TRIGGER update_contest_offers_count_on_update
  AFTER UPDATE ON public.contest_offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.contest_id IS DISTINCT FROM NEW.contest_id)
  EXECUTE FUNCTION private.update_contest_offers_count();

CREATE TRIGGER update_contest_offers_count_on_delete
  AFTER DELETE ON public.contest_offers
  FOR EACH ROW
  EXECUTE FUNCTION private.update_contest_offers_count();

DROP FUNCTION IF EXISTS public.update_contest_offers_count();
DROP FUNCTION IF EXISTS public.update_tender_bids_count();

-- Backfill without bumping contests.updated_at on every row.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_contests_updated_at'
      AND tgrelid = 'public.contests'::regclass
  ) THEN
    ALTER TABLE public.contests DISABLE TRIGGER update_contests_updated_at;
  END IF;
END $$;

UPDATE public.contests AS c
SET offers_count = live.live_count
FROM (
  SELECT
    c2.id,
    (
      SELECT COUNT(*)
      FROM public.contest_offers AS co
      WHERE co.contest_id = c2.id
        AND co.status NOT IN ('cancelled', 'draft')
    ) AS live_count
  FROM public.contests AS c2
) AS live
WHERE c.id = live.id
  AND c.offers_count IS DISTINCT FROM live.live_count;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_contests_updated_at'
      AND tgrelid = 'public.contests'::regclass
      AND tgenabled = 'D'
  ) THEN
    ALTER TABLE public.contests ENABLE TRIGGER update_contests_updated_at;
  END IF;
END $$;
