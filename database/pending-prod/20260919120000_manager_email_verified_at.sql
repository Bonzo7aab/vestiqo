-- App-level email confirmation for manager two-step verification.
-- GoTrue stays auto-confirmed so users can log in before confirming.
-- Apply to vestiqo-test first. Do not apply to production without approval.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.email_verified_at IS
  'App-level email confirmation timestamp. Distinct from auth.users.email_confirmed_at so managers can log in before confirming.';

UPDATE public.user_profiles
SET email_verified_at = COALESCE(created_at, NOW())
WHERE email_verified_at IS NULL;

-- Users can update their own profile; keep this column service-role / SQL only.
REVOKE UPDATE (email_verified_at) ON public.user_profiles FROM authenticated;
REVOKE UPDATE (email_verified_at) ON public.user_profiles FROM anon;
