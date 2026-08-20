-- OPD-48: allow managers to pick an event kind on custom calendar notes.
-- Apply to vestiqo-test first. Do not apply to production without approval.

ALTER TABLE public.manager_calendar_notes
  ADD COLUMN IF NOT EXISTS event_kind TEXT NOT NULL DEFAULT 'custom';

ALTER TABLE public.manager_calendar_notes
  DROP CONSTRAINT IF EXISTS manager_calendar_notes_event_kind_check;

ALTER TABLE public.manager_calendar_notes
  ADD CONSTRAINT manager_calendar_notes_event_kind_check
  CHECK (event_kind IN ('inspection', 'warranty', 'contest', 'order', 'custom'));

COMMENT ON COLUMN public.manager_calendar_notes.event_kind IS
  'OPD-48: display/filter kind for a user-created calendar event.';
