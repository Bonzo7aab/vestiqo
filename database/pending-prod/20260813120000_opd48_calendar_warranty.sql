-- OPD-48: warranty dates on orders, contest↔building links, reminder send log.
-- Apply to vestiqo-test first. Do not apply to production without approval.

-- =============================================================================
-- 1. Warranty columns on orders
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS warranty_months INTEGER,
  ADD COLUMN IF NOT EXISTS warranty_expires_at DATE;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_warranty_months_positive;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_warranty_months_positive
  CHECK (warranty_months IS NULL OR warranty_months > 0);

COMMENT ON COLUMN public.orders.warranty_months IS
  'OPD-48: winning-offer warranty (or guarantee) months at work acceptance.';
COMMENT ON COLUMN public.orders.warranty_expires_at IS
  'OPD-48: calendar date = date(completed_at) + warranty_months.';

CREATE INDEX IF NOT EXISTS idx_orders_warranty_expires_at
  ON public.orders (warranty_expires_at)
  WHERE warranty_expires_at IS NOT NULL;

-- =============================================================================
-- 2. contest_buildings
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contest_buildings (
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.managed_buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contest_id, building_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_buildings_building_id
  ON public.contest_buildings (building_id);

ALTER TABLE public.contest_buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contest buildings" ON public.contest_buildings;
CREATE POLICY "Users can view contest buildings" ON public.contest_buildings
  FOR SELECT USING (public.user_can_manage_contest(contest_id));

DROP POLICY IF EXISTS "Users can insert contest buildings" ON public.contest_buildings;
CREATE POLICY "Users can insert contest buildings" ON public.contest_buildings
  FOR INSERT WITH CHECK (
    public.user_can_manage_contest(contest_id)
    AND EXISTS (
      SELECT 1
      FROM public.contests c
      JOIN public.managed_buildings mb ON mb.id = contest_buildings.building_id
      WHERE c.id = contest_buildings.contest_id
        AND (
          c.managed_entity_id IS NULL
          OR mb.managed_entity_id = c.managed_entity_id
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete contest buildings" ON public.contest_buildings;
CREATE POLICY "Users can delete contest buildings" ON public.contest_buildings
  FOR DELETE USING (public.user_can_manage_contest(contest_id));

GRANT SELECT, INSERT, DELETE ON public.contest_buildings TO authenticated;
GRANT ALL ON public.contest_buildings TO service_role;

-- =============================================================================
-- 3. calendar_reminder_sends (idempotency for 30-day reminders)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.calendar_reminder_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('inspection', 'warranty')),
  source_id UUID NOT NULL,
  due_on DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_kind, source_id, due_on)
);

CREATE INDEX IF NOT EXISTS idx_calendar_reminder_sends_due
  ON public.calendar_reminder_sends (due_on);

ALTER TABLE public.calendar_reminder_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own calendar reminder sends" ON public.calendar_reminder_sends;
CREATE POLICY "Users can view own calendar reminder sends" ON public.calendar_reminder_sends
  FOR SELECT USING (user_id = auth.uid());

GRANT SELECT ON public.calendar_reminder_sends TO authenticated;
GRANT ALL ON public.calendar_reminder_sends TO service_role;
