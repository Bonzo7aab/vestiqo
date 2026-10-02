/**
 * Unclaimed wspólnota company shell (OPD-192).
 * Run: npx tsx tests/unit/community-shell.test.ts
 */
import assert from 'node:assert/strict';
import {
  communityCompanyHasIndependentLogin,
  communityShellInsert,
  isUnclaimedCommunityShell,
  resolveCommunityCompanyAction,
  type CommunityShellCandidate,
} from '../../src/lib/community-claims/community-shell';

const NIP = '5261040828';

function company(partial: Partial<CommunityShellCandidate> & Pick<CommunityShellCandidate, 'id'>): CommunityShellCandidate {
  return {
    nip: NIP,
    type: 'wspólnota',
    is_verified: false,
    is_public: false,
    linkedUserCount: 0,
    ...partial,
  };
}

const shell = company({ id: 'shell-1' });

assert.equal(isUnclaimedCommunityShell(shell, NIP), true);
assert.equal(communityCompanyHasIndependentLogin(shell), false);
assert.deepEqual(resolveCommunityCompanyAction([shell], NIP), {
  action: 'reuse',
  companyId: 'shell-1',
});

assert.deepEqual(resolveCommunityCompanyAction([], NIP), { action: 'create' });

const linked = company({ id: 'linked-1', linkedUserCount: 1, is_verified: true, is_public: true });
assert.equal(isUnclaimedCommunityShell(linked, NIP), false);
assert.equal(communityCompanyHasIndependentLogin(linked), true);
assert.deepEqual(resolveCommunityCompanyAction([linked], NIP), { action: 'create' });

const publicUnverified = company({ id: 'public-1', is_public: true });
assert.equal(isUnclaimedCommunityShell(publicUnverified, NIP), false);
assert.equal(communityCompanyHasIndependentLogin(publicUnverified), false);

const verifiedPrivate = company({ id: 'verified-1', is_verified: true });
assert.equal(isUnclaimedCommunityShell(verifiedPrivate, NIP), false);

const managerCompany = company({ id: 'mgr-1', type: 'property_management' });
assert.equal(isUnclaimedCommunityShell(managerCompany, NIP), false);
assert.equal(communityCompanyHasIndependentLogin(managerCompany), false);

const inserted = communityShellInsert({
  nip: '526-104-08-28',
  name: '  Wspólnota Test  ',
  regon: ' 123 ',
  address: 'ul. Test 1',
  city: 'Warszawa',
  postal_code: '00-001',
});
assert.equal(inserted.type, 'wspólnota');
assert.equal(inserted.nip, NIP);
assert.equal(inserted.name, 'Wspólnota Test');
assert.equal(inserted.regon, '123');
assert.equal(inserted.email, null);
assert.equal(inserted.phone, null);
assert.equal(inserted.is_verified, false);
assert.equal(inserted.is_public, false);
assert.equal(inserted.verification_level, 'none');

console.log('community-shell.test.ts: ok');
