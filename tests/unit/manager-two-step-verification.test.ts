/**
 * Manager two-step verification (run: npx tsx tests/unit/manager-two-step-verification.test.ts)
 */
import assert from 'node:assert/strict';
import { resolveVerificationStatus } from '../../src/lib/verification/resolve-verification-state';
import {
  isManagerAccessPending,
  isManagerVerificationPath,
  MANAGER_VERIFICATION_PATH,
} from '../../src/lib/auth/manager-access-pending';
import {
  signEmailVerificationToken,
  verifyEmailVerificationToken,
} from '../../src/lib/auth/email-verification-token';
import {
  ACCOUNT_ROLES,
  resolveRegistrationCompanyType,
  shouldShowManagedHousingEntitiesOnAccount,
} from '../../src/lib/profile/account-role-labels';

assert.equal(MANAGER_VERIFICATION_PATH, '/weryfikacja-konta');
assert.equal(isManagerVerificationPath('/weryfikacja-konta'), true);
assert.equal(isManagerVerificationPath('/weryfikacja-konta/x'), true);
assert.equal(isManagerVerificationPath('/panel-zarzadcy'), false);

assert.equal(
  isManagerAccessPending({
    userType: 'manager',
    isVerified: false,
    emailVerifiedAt: null,
  }),
  true,
);
assert.equal(
  isManagerAccessPending({
    userType: 'manager',
    isVerified: false,
    emailVerifiedAt: '2026-09-19T00:00:00.000Z',
  }),
  true,
);
assert.equal(
  isManagerAccessPending({
    userType: 'manager',
    isVerified: true,
    emailVerifiedAt: '2026-09-19T00:00:00.000Z',
  }),
  false,
);
assert.equal(
  isManagerAccessPending({
    userType: 'manager',
    platformRole: 'platform_admin',
    isVerified: false,
    emailVerifiedAt: null,
  }),
  false,
);
assert.equal(
  isManagerAccessPending({
    userType: 'contractor',
    isVerified: false,
    emailVerifiedAt: null,
  }),
  false,
);
assert.equal(
  isManagerAccessPending({
    userType: 'manager',
    isVerified: false,
    emailVerifiedAt: null,
    verificationFieldsAvailable: false,
  }),
  true,
);
assert.equal(
  isManagerAccessPending({
    userType: 'manager',
    isVerified: true,
    emailVerifiedAt: null,
    verificationFieldsAvailable: false,
  }),
  false,
);
assert.equal(resolveRegistrationCompanyType(ACCOUNT_ROLES.PROPERTY_MANAGER), 'property_management');
assert.equal(resolveRegistrationCompanyType(ACCOUNT_ROLES.CONDO_BOARD), 'wspólnota');
assert.equal(resolveRegistrationCompanyType(ACCOUNT_ROLES.COOPERATIVE_BOARD), 'spółdzielnia');
assert.equal(shouldShowManagedHousingEntitiesOnAccount(ACCOUNT_ROLES.PROPERTY_MANAGER), true);

const managerPending = resolveVerificationStatus({
  userType: 'manager',
  isVerified: false,
  submittedAt: '2026-09-19T12:00:00.000Z',
});
assert.equal(managerPending.state, 'pending');

const managerApproved = resolveVerificationStatus({
  userType: 'manager',
  isVerified: true,
  submittedAt: null,
});
assert.equal(managerApproved.state, 'approved');

const managerRejected = resolveVerificationStatus({
  userType: 'manager',
  isVerified: false,
  submittedAt: null,
  latestDecision: {
    decision: 'rejected',
    reason: 'Błędny numer NIP',
    created_at: '2026-09-19T12:00:00.000Z',
  },
});
assert.equal(managerRejected.state, 'rejected');
assert.equal(managerRejected.reason, 'Błędny numer NIP');

const now = Date.UTC(2026, 8, 19, 12, 0, 0);
const token = signEmailVerificationToken('user-123', now, 60_000);
const valid = verifyEmailVerificationToken(token, now + 1_000);
assert.ok(valid);
assert.equal(valid?.userId, 'user-123');

const expired = verifyEmailVerificationToken(token, now + 120_000);
assert.equal(expired, null);

const tampered = `${token.slice(0, -2)}aa`;
assert.equal(verifyEmailVerificationToken(tampered, now + 1_000), null);

console.log('manager-two-step-verification tests passed');
