-- OPD-48: user-created calendar notes (events) for managers.
-- Apply to vestiqo-test first. Do not apply to production without approval.

CREATE TABLE IF NOT EXISTS public.manager_calendar_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_on DATE NOT NULL,
  start_hour SMALLINT CHECK (start_hour IS NULL OR (start_hour >= 0 AND start_hour <= 23)),
  managed_entity_id UUID REFERENCES public.managed_housing_entities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_calendar_notes_company_due
  ON public.manager_calendar_notes (company_id, due_on);

COMMENT ON TABLE public.manager_calendar_notes IS
  'OPD-48: custom calendar events created by a manager, shown alongside inspections and warranties.';

ALTER TABLE public.manager_calendar_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view calendar notes" ON public.manager_calendar_notes;
CREATE POLICY "Company members can view calendar notes" ON public.manager_calendar_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.company_id = manager_calendar_notes.company_id
        AND uc.user_id = auth.uid()
        AND COALESCE(uc.is_active, true)
    )
  );

DROP POLICY IF EXISTS "Company members can insert own calendar notes" ON public.manager_calendar_notes;
CREATE POLICY "Company members can insert own calendar notes" ON public.manager_calendar_notes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.company_id = manager_calendar_notes.company_id
        AND uc.user_id = auth.uid()
        AND COALESCE(uc.is_active, true)
    )
    AND (
      managed_entity_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.managed_housing_entities mhe
        WHERE mhe.id = manager_calendar_notes.managed_entity_id
          AND mhe.manager_company_id = manager_calendar_notes.company_id
      )
    )
  );

DROP POLICY IF EXISTS "Owners can delete own calendar notes" ON public.manager_calendar_notes;
CREATE POLICY "Owners can delete own calendar notes" ON public.manager_calendar_notes
  FOR DELETE USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.manager_calendar_notes TO authenticated;
GRANT ALL ON public.manager_calendar_notes TO service_role;
