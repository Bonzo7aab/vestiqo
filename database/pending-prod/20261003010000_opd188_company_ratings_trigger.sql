-- OPD-188: manager cooperation reviews fail with
-- "new row violates row-level security policy for table company_ratings".
--
-- company_reviews INSERT is allowed for the reviewer, but the AFTER trigger
-- update_company_ratings() runs as that user and upserts company_ratings.
-- RLS on company_ratings is SELECT-only, so the upsert is rejected and the
-- review rolls back.
--
-- Move the refresh into a private-schema SECURITY DEFINER function owned by
-- the migration role (bypasses RLS). Do not add a client INSERT/UPDATE policy
-- on company_ratings — averages must only be recomputed from reviews.
-- Apply to vestiqo-test first. Do not apply to production without approval.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated;

CREATE OR REPLACE FUNCTION private.update_company_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_ids uuid[];
  target_company_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_ids := ARRAY[OLD.company_id];
  ELSIF TG_OP = 'UPDATE' AND OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    target_ids := ARRAY[NEW.company_id, OLD.company_id];
  ELSE
    target_ids := ARRAY[NEW.company_id];
  END IF;

  FOREACH target_company_id IN ARRAY target_ids LOOP
    IF target_company_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.company_ratings (
      company_id,
      average_rating,
      total_reviews,
      rating_breakdown,
      category_ratings,
      last_review_date,
      updated_at
    )
    SELECT
      target_company_id,
      ROUND(AVG(rating)::numeric, 2),
      COUNT(*),
      jsonb_build_object(
        '5', COUNT(*) FILTER (WHERE rating = 5),
        '4', COUNT(*) FILTER (WHERE rating = 4),
        '3', COUNT(*) FILTER (WHERE rating = 3),
        '2', COUNT(*) FILTER (WHERE rating = 2),
        '1', COUNT(*) FILTER (WHERE rating = 1)
      ),
      jsonb_build_object(
        'quality', ROUND(AVG((categories->>'quality')::numeric), 1),
        'timeliness', ROUND(AVG((categories->>'timeliness')::numeric), 1),
        'communication', ROUND(AVG((categories->>'communication')::numeric), 1),
        'pricing', ROUND(AVG((categories->>'pricing')::numeric), 1)
      ),
      MAX(created_at),
      NOW()
    FROM public.company_reviews
    WHERE company_id = target_company_id
      AND is_public = true
    ON CONFLICT (company_id)
    DO UPDATE SET
      average_rating = EXCLUDED.average_rating,
      total_reviews = EXCLUDED.total_reviews,
      rating_breakdown = EXCLUDED.rating_breakdown,
      category_ratings = EXCLUDED.category_ratings,
      last_review_date = EXCLUDED.last_review_date,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.update_company_ratings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.update_company_ratings() TO postgres, service_role, authenticated;

DROP TRIGGER IF EXISTS trigger_update_company_ratings ON public.company_reviews;
CREATE TRIGGER trigger_update_company_ratings
  AFTER INSERT OR UPDATE OR DELETE ON public.company_reviews
  FOR EACH ROW
  EXECUTE FUNCTION private.update_company_ratings();

DROP FUNCTION IF EXISTS public.update_company_ratings();
