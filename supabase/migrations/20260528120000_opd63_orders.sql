-- OPD-63: Zamówienia — formal order after contest winner selection

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  tender_bid_id UUID NOT NULL REFERENCES public.tender_bids(id) ON DELETE RESTRICT,
  manager_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  manager_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  contractor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
  contractor_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'in_progress',
    'awaiting_acceptance',
    'completed',
    'cancelled'
  )),
  title TEXT NOT NULL,
  location_label TEXT,
  completion_deadline DATE,
  net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  vat_rate TEXT NOT NULL DEFAULT '23' CHECK (vat_rate IN ('8', '23', 'zw')),
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  reported_for_acceptance_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tender_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_manager_company_status
  ON public.orders (manager_company_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_contractor_company_status
  ON public.orders (contractor_company_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_tender_id ON public.orders (tender_id);

COMMENT ON TABLE public.orders IS 'OPD-63: Zamówienie created when manager selects contest winner';

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Managers: view/update orders for their company
CREATE POLICY "Managers can view company orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = orders.manager_company_id
    )
  );

CREATE POLICY "Managers can update company orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = orders.manager_company_id
    )
  );

CREATE POLICY "Managers can insert orders for their tenders" ON public.orders
  FOR INSERT WITH CHECK (
    manager_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tenders t
      WHERE t.id = orders.tender_id
        AND t.manager_id = auth.uid()
        AND t.company_id = orders.manager_company_id
    )
  );

-- Contractors: view/update orders for their company
CREATE POLICY "Contractors can view company orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = orders.contractor_company_id
    )
  );

CREATE POLICY "Contractors can update company orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = orders.contractor_company_id
    )
  );

-- Backfill: awarded contests with accepted bid but no order yet
INSERT INTO public.orders (
  tender_id,
  tender_bid_id,
  manager_id,
  manager_company_id,
  contractor_id,
  contractor_company_id,
  status,
  title,
  location_label,
  completion_deadline,
  net_amount,
  gross_amount,
  vat_rate,
  currency,
  created_at,
  updated_at
)
SELECT
  t.id,
  b.id,
  t.manager_id,
  t.company_id,
  b.contractor_id,
  b.company_id,
  'in_progress',
  COALESCE(t.title, 'Zamówienie'),
  COALESCE(
    NULLIF(TRIM(CONCAT_WS(', ', bd.street_address, bd.city)), ''),
    NULLIF(TRIM(t.address), ''),
    NULLIF(TRIM(bd.name), ''),
    '—'
  ),
  t.completion_date,
  COALESCE(
    (b.offer_details->>'netPrice')::numeric,
    b.bid_amount,
    0
  ),
  COALESCE(
    (b.offer_details->>'grossPrice')::numeric,
    CASE
      WHEN COALESCE(b.offer_details->>'vatRate', '23') = 'zw' THEN COALESCE((b.offer_details->>'netPrice')::numeric, b.bid_amount, 0)
      WHEN COALESCE(b.offer_details->>'vatRate', '23') = '8' THEN ROUND(COALESCE((b.offer_details->>'netPrice')::numeric, b.bid_amount, 0) * 1.08, 2)
      ELSE ROUND(COALESCE((b.offer_details->>'netPrice')::numeric, b.bid_amount, 0) * 1.23, 2)
    END
  ),
  CASE
    WHEN b.offer_details->>'vatRate' IN ('8', '23', 'zw') THEN b.offer_details->>'vatRate'
    ELSE '23'
  END,
  COALESCE(b.currency, 'PLN'),
  NOW(),
  NOW()
FROM public.tenders t
INNER JOIN public.tender_bids b ON b.tender_id = t.id AND b.status = 'accepted'
LEFT JOIN public.buildings bd ON bd.id = t.building_id
WHERE t.status = 'awarded'
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.tender_id = t.id)
ON CONFLICT (tender_id) DO NOTHING;

-- Sync winning_bid_id / winner_name for backfilled and future rows
UPDATE public.tenders t
SET
  winning_bid_id = b.id,
  winner_name = c.name,
  updated_at = NOW()
FROM public.tender_bids b
INNER JOIN public.companies c ON c.id = b.company_id
WHERE b.tender_id = t.id
  AND b.status = 'accepted'
  AND t.status = 'awarded'
  AND (t.winning_bid_id IS NULL OR t.winner_name IS NULL);
