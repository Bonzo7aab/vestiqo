-- OPD-41: In-app notification preferences + contest-end critical notifications
-- Run as a whole script in psql / Supabase SQL editor, or apply via apply_migration.
-- If your tool rejects multi-statement scripts, run the three sections separately
-- (see 20260620120001_opd41_contest_end_cron.sql for function + cron only).

-- =============================================================================
-- 1. Role-specific in-app notification preference columns
-- =============================================================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS manager_contest_question_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS contractor_contest_resolution_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS contractor_contest_answer_notifications BOOLEAN DEFAULT TRUE;
