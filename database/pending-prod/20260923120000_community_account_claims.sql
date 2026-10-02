-- Wspólnota account claims: independent login for a NIP that currently exists
-- only as a Zarządca-managed housing entity.
-- Apply to vestiqo-test first. Do not apply to production without approval.

ALTER TABLE public.managed_housing_entities
  ADD COLUMN IF NOT EXISTS management_blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.managed_housing_entities.management_blocked_at IS
  'When set, the Zarządca cannot post new contests or edit/add this entity. Historical contests remain.';
COMMENT ON COLUMN public.managed_housing_entities.claimed_company_id IS
  'Company created for the independent Wspólnota after an approved account claim.';

CREATE INDEX IF NOT EXISTS idx_managed_housing_entities_blocked
  ON public.managed_housing_entities (manager_company_id)
  WHERE management_blocked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_managed_housing_entities_claimed_company
  ON public.managed_housing_entities (claimed_company_id)
  WHERE claimed_company_id IS NOT NULL;

REVOKE UPDATE (management_blocked_at, claimed_company_id)
  ON public.managed_housing_entities FROM authenticated;
REVOKE UPDATE (management_blocked_at, claimed_company_id)
  ON public.managed_housing_entities FROM anon;

CREATE OR REPLACE FUNCTION public.prevent_delete_blocked_managed_entity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.management_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Blocked managed housing entities cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_blocked_managed_entity ON public.managed_housing_entities;
CREATE TRIGGER trg_prevent_delete_blocked_managed_entity
  BEFORE DELETE ON public.managed_housing_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_blocked_managed_entity();

CREATE TABLE IF NOT EXISTS public.community_account_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  managed_entity_id UUID NOT NULL REFERENCES public.managed_housing_entities(id) ON DELETE RESTRICT,
  nip VARCHAR(20) NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  resolution_path TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reject_reason TEXT,
  created_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  gus_snapshot JSONB
);

COMMENT ON TABLE public.community_account_claims IS
  'Unauthenticated Wspólnota claims for a NIP that exists only as a managed housing entity.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_account_claims_one_pending
  ON public.community_account_claims (managed_entity_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_community_account_claims_status_submitted
  ON public.community_account_claims (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_account_claims_email
  ON public.community_account_claims (lower(email));

ALTER TABLE public.community_account_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins manage community account claims"
  ON public.community_account_claims;
CREATE POLICY "Platform admins manage community account claims"
  ON public.community_account_claims
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT, UPDATE ON public.community_account_claims TO authenticated;
GRANT ALL ON public.community_account_claims TO service_role;
