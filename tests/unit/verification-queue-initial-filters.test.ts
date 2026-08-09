/**
 * OPD-166 admin verification queue filter seeding (run: npx tsx tests/unit/verification-queue-initial-filters.test.ts)
 */
import assert from 'node:assert/strict';
import {
  hasUsersOutsideCurrentFilter,
  resolveInitialVerificationFilters,
  resolveStatusForSegment,
} from '../../src/lib/admin/verification-queue-initial-filters';

const managerApproved = {
  userId: 'm1',
  userType: 'manager',
  accountRole: 'property_manager',
  organizationType: 'wspólnota',
  companyType: null,
  emailConfirmed: true,
};

const contractorPending = {
  userId: 'c1',
  userType: 'contractor',
  accountRole: null,
  organizationType: null,
  companyType: null,
  emailConfirmed: true,
};

const managerEmail = {
  userId: 'm2',
  userType: 'manager',
  accountRole: 'property_manager',
  organizationType: 'wspólnota',
  companyType: null,
  emailConfirmed: false,
};

{
  const initial = resolveInitialVerificationFilters([], [], [managerApproved]);
  assert.deepEqual(initial, { role: 'manager', status: 'approved' });
}

{
  const initial = resolveInitialVerificationFilters([contractorPending], [], [managerApproved]);
  assert.deepEqual(initial, { role: 'contractor', status: 'pending' });
}

{
  const initial = resolveInitialVerificationFilters([], [], [managerEmail]);
  assert.deepEqual(initial, { role: 'manager', status: 'email' });
}

{
  const status = resolveStatusForSegment(
    'manager',
    'pending',
    [],
    [],
    [managerApproved],
  );
  assert.equal(status, 'approved');
}

{
  assert.equal(
    hasUsersOutsideCurrentFilter('contractor', 'pending', [], [], [managerApproved]),
    true,
  );
  assert.equal(
    hasUsersOutsideCurrentFilter('manager', 'approved', [], [], [managerApproved]),
    false,
  );
}

console.log('verification-queue-initial-filters.test.ts: ok');
