-- OPD-106: Protokół z wyboru ofert — justification note and resolution timestamp

ALTER TABLE public.contests
  ADD COLUMN IF NOT EXISTS selection_justification TEXT,
  ADD COLUMN IF NOT EXISTS awarded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.contests.selection_justification IS 'OPD-106: Manager note entered when selecting winning offer (PDF protocol section 3)';
COMMENT ON COLUMN public.contests.awarded_at IS 'OPD-106: Timestamp when contest was resolved (status awarded)';
