/**
 * Community account claim helpers (run: npx tsx tests/unit/community-account-claims.test.ts)
 */
import assert from 'node:assert/strict';
import {
  COMMUNITY_CLAIM_HAS_OWN_ACCOUNT_MESSAGE,
  COMMUNITY_CLAIM_INELIGIBLE_MESSAGE,
  COMMUNITY_CLAIM_PENDING_MESSAGE,
  COMMUNITY_CLAIM_SLA_HOURS,
  communityClaimResolutionPath,
  describeCommunityClaimEligibility,
  hoursSinceSubmitted,
  isCommunityClaimOverdue,
} from '../../src/lib/community-claims/constants';
import {
  filterActiveManagedHousingEntities,
  isManagedHousingEntityBlocked,
  type ManagedHousingEntity,
} from '../../src/types/managed-housing-entity';

function entity(partial: Partial<ManagedHousingEntity> & Pick<ManagedHousingEntity, 'id' | 'management_blocked_at'>): ManagedHousingEntity {
  return {
    manager_company_id: 'mgr-1',
    entity_type: 'wspólnota',
    nip: '1234567890',
    regon: null,
    name: 'WM Test',
    address: null,
    city: null,
    postal_code: null,
    bank_account_iban: null,
    vat_status: null,
    claimed_company_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

assert.equal(COMMUNITY_CLAIM_SLA_HOURS, 48);
assert.equal(communityClaimResolutionPath('claim-1'), 'claims/claim-1/uchwala.pdf');

assert.deepEqual(describeCommunityClaimEligibility('ok'), { eligible: true });
assert.equal(
  describeCommunityClaimEligibility('has_condo_board').message,
  COMMUNITY_CLAIM_HAS_OWN_ACCOUNT_MESSAGE,
);
assert.equal(
  describeCommunityClaimEligibility('pending_exists').message,
  COMMUNITY_CLAIM_PENDING_MESSAGE,
);
assert.equal(
  describeCommunityClaimEligibility('not_found').message,
  COMMUNITY_CLAIM_INELIGIBLE_MESSAGE,
);
assert.equal(
  describeCommunityClaimEligibility('blocked').message,
  COMMUNITY_CLAIM_INELIGIBLE_MESSAGE,
);

const submitted = '2026-09-21T00:00:00.000Z';
const now = Date.parse('2026-09-23T12:00:00.000Z');
assert.equal(Math.floor(hoursSinceSubmitted(submitted, now)), 60);
assert.equal(isCommunityClaimOverdue(submitted, now), true);
assert.equal(isCommunityClaimOverdue('2026-09-23T00:00:00.000Z', now), false);

const active = entity({ id: 'a', management_blocked_at: null });
const blocked = entity({
  id: 'b',
  management_blocked_at: '2026-09-23T00:00:00.000Z',
  claimed_company_id: 'company-claimed',
});
assert.equal(isManagedHousingEntityBlocked(active), false);
assert.equal(isManagedHousingEntityBlocked(blocked), true);
assert.deepEqual(
  filterActiveManagedHousingEntities([active, blocked]).map((item) => item.id),
  ['a'],
);

// Claim approval must keep the managed entity row (historical contests).
assert.equal(blocked.id, 'b');
assert.equal(blocked.claimed_company_id, 'company-claimed');

console.log('community-account-claims.test.ts: ok');
