-- Account recovery claims can replace a login email when the owner cannot
-- access the inbox. Apply to vestiqo-test first. Do not apply to production
-- without approval.

ALTER TABLE public.community_account_claims
  ADD COLUMN IF NOT EXISTS claim_purpose VARCHAR(30) NOT NULL DEFAULT 'community_login';

ALTER TABLE public.community_account_claims
  DROP CONSTRAINT IF EXISTS community_account_claims_claim_purpose_check;

ALTER TABLE public.community_account_claims
  ADD CONSTRAINT community_account_claims_claim_purpose_check
  CHECK (claim_purpose IN ('community_login', 'email_recovery'));

ALTER TABLE public.community_account_claims
  ALTER COLUMN managed_entity_id DROP NOT NULL;

COMMENT ON COLUMN public.community_account_claims.claim_purpose IS
  'community_login creates a Wspólnota login. email_recovery replaces the existing login email after admin review.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_account_claims_one_pending_email_recovery
  ON public.community_account_claims (nip)
  WHERE status = 'pending' AND claim_purpose = 'email_recovery';
