-- Backfill tenders.bids_count to match update_tender_bids_count trigger logic
UPDATE public.tenders t
SET bids_count = COALESCE((
  SELECT COUNT(*)::integer
  FROM public.tender_bids tb
  WHERE tb.tender_id = t.id
    AND tb.status NOT IN ('draft', 'cancelled')
), 0);
