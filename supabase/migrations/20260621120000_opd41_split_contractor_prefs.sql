-- OPD-41 (TEST): Split contractor contest resolution into separate win/lose toggles (per Jira)

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS contractor_contest_offer_accepted_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS contractor_contest_offer_rejected_notifications BOOLEAN DEFAULT TRUE;

UPDATE public.notification_preferences
SET
  contractor_contest_offer_accepted_notifications = COALESCE(
    contractor_contest_offer_accepted_notifications,
    contractor_contest_resolution_notifications,
    TRUE
  ),
  contractor_contest_offer_rejected_notifications = COALESCE(
    contractor_contest_offer_rejected_notifications,
    contractor_contest_resolution_notifications,
    TRUE
  );
