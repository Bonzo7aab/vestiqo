-- OPD-185: per-type certificate/qualification scans on contractor profiles.
-- Apply to vestiqo-test first. Do not apply to production without approval.

ALTER TABLE public.contractor_account_settings
  ADD COLUMN IF NOT EXISTS professional_qualification_documents JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.contractor_account_settings.professional_qualification_documents IS
  'OPD-185: map of qualification catalog id → { path, fileName, validUntil }. Shared scan columns remain as read fallback.';
