-- Remove legacy Przetarg data, keep Konkurs records.
-- Contest rows are recognized by contest-only fields in `tenders`.

BEGIN;

CREATE TEMP TABLE tmp_legacy_tender_ids ON COMMIT DROP AS
SELECT t.id
FROM public.tenders AS t
WHERE t.building_id IS NULL
  AND t.selection_criteria IS NULL
  AND t.formal_requirements IS NULL;

DO $$
DECLARE
  legacy_count integer;
  contest_count integer;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM tmp_legacy_tender_ids;
  SELECT COUNT(*) INTO contest_count
  FROM public.tenders
  WHERE id NOT IN (SELECT id FROM tmp_legacy_tender_ids);

  RAISE NOTICE 'Preflight: legacy tenders to delete = %', legacy_count;
  RAISE NOTICE 'Preflight: contests preserved = %', contest_count;
END $$;

-- Explicit cleanup for notification payloads/links that are not FK-constrained.
DELETE FROM public.notifications n
WHERE
  (
    (n.data ->> 'tender_id') IN (SELECT id::text FROM tmp_legacy_tender_ids)
    OR (n.data ->> 'tenderId') IN (SELECT id::text FROM tmp_legacy_tender_ids)
  )
  OR EXISTS (
    SELECT 1
    FROM tmp_legacy_tender_ids l
    WHERE n.action_url LIKE '%' || l.id::text || '%'
      AND (
        n.action_url LIKE '%/manager-dashboard/tenders%'
        OR n.action_url LIKE '%/post-tender%'
        OR n.action_url LIKE '%/tenders/%'
      )
  );

-- Root delete; dependent records are removed by FK cascade.
DELETE FROM public.tenders t
WHERE t.id IN (SELECT id FROM tmp_legacy_tender_ids);

DO $$
DECLARE
  remaining_legacy_tenders integer;
  orphan_bids integer;
  orphan_questions integer;
  orphan_conversations integer;
BEGIN
  SELECT COUNT(*) INTO remaining_legacy_tenders
  FROM public.tenders
  WHERE building_id IS NULL
    AND selection_criteria IS NULL
    AND formal_requirements IS NULL;

  SELECT COUNT(*) INTO orphan_bids
  FROM public.tender_bids tb
  LEFT JOIN public.tenders t ON t.id = tb.tender_id
  WHERE t.id IS NULL;

  SELECT COUNT(*) INTO orphan_questions
  FROM public.questions q
  LEFT JOIN public.tenders t ON t.id = q.tender_id
  WHERE q.tender_id IS NOT NULL
    AND t.id IS NULL;

  SELECT COUNT(*) INTO orphan_conversations
  FROM public.conversations c
  LEFT JOIN public.tenders t ON t.id = c.tender_id
  WHERE c.tender_id IS NOT NULL
    AND t.id IS NULL;

  RAISE NOTICE 'Post-check: remaining legacy tenders = %', remaining_legacy_tenders;
  RAISE NOTICE 'Post-check: orphan tender_bids = %', orphan_bids;
  RAISE NOTICE 'Post-check: orphan questions = %', orphan_questions;
  RAISE NOTICE 'Post-check: orphan conversations = %', orphan_conversations;
END $$;

COMMIT;
