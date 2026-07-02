-- One non-cancelled offer per company per contest (prevents duplicate submitted offers).

CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_offers_one_per_company
  ON public.contest_offers (contest_id, company_id)
  WHERE status != 'cancelled';
