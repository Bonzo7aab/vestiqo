-- Account-level suspension, separate from is_verified.
-- A suspended user stays verified but cannot create a contest or submit a contest offer.
-- Apply to vestiqo-test first. Do not apply to production without approval.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS actions_suspended BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.actions_suspended IS
  'When true, a verified account cannot create contests or submit contest offers. Does not clear is_verified.';

REVOKE UPDATE (actions_suspended) ON public.user_profiles FROM authenticated;
REVOKE UPDATE (actions_suspended) ON public.user_profiles FROM anon;

-- Table-level UPDATE still lets a user change their own row. Block the column
-- unless the request is the service role (platform admin action) or a superuser.
CREATE OR REPLACE FUNCTION public.prevent_user_actions_suspended_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.actions_suspended IS DISTINCT FROM OLD.actions_suspended
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'actions_suspended can only be changed by a platform administrator'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_protect_actions_suspended ON public.user_profiles;
CREATE TRIGGER user_profiles_protect_actions_suspended
  BEFORE UPDATE OF actions_suspended ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_actions_suspended_change();

-- Reject contest and offer writes from the suspended account itself.
-- Service-role and admin sessions (auth.uid() null or a different user) can still moderate.
CREATE OR REPLACE FUNCTION public.reject_write_when_actions_suspended()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  suspended boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT actions_suspended INTO suspended
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF suspended IS TRUE THEN
    IF TG_TABLE_NAME IN ('contests', 'tenders') THEN
      RAISE EXCEPTION 'Twoje konto jest zawieszone. Nie możesz utworzyć konkursu.'
        USING ERRCODE = '42501';
    END IF;

    RAISE EXCEPTION 'Twoje konto jest zawieszone. Nie możesz złożyć oferty.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target regclass;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    to_regclass('public.contests'),
    to_regclass('public.tenders'),
    to_regclass('public.contest_offers'),
    to_regclass('public.tender_bids')
  ]
  LOOP
    IF target IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS reject_write_when_actions_suspended ON %s',
      target
    );
    EXECUTE format(
      'CREATE TRIGGER reject_write_when_actions_suspended
         BEFORE INSERT OR UPDATE ON %s
         FOR EACH ROW
         EXECUTE FUNCTION public.reject_write_when_actions_suspended()',
      target
    );
  END LOOP;
END $$;
