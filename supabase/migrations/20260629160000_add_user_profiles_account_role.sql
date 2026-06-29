-- OPD-129: Persist registration account role for role-specific "Twoje dane" section labels.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS account_role TEXT;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_account_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_account_role_check
  CHECK (
    account_role IS NULL
    OR account_role IN (
      'condo_board',
      'property_manager',
      'cooperative_board',
      'cooperative_admin',
      'contractor'
    )
  );

COMMENT ON COLUMN public.user_profiles.account_role IS
  'Registration role for profile UI labels (OPD-128/129): condo_board, property_manager, cooperative_board, cooperative_admin, contractor.';
