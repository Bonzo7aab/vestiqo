/**
 * OPD-177 contractor verification (run: npx tsx tests/unit/opd177-contractor-verification.test.ts)
 */
import assert from 'node:assert/strict';
import {
  getRequiredDocumentKeys,
  mergeRequiredVerificationDocuments,
  type VerificationDocumentEntry,
} from '../../src/lib/verification/required-documents';
import { resolveVerificationStatus } from '../../src/lib/verification/resolve-verification-state';
import type { CompanyRegistrySnapshot } from '../../src/lib/registry/types';

assert.deepEqual(getRequiredDocumentKeys('contractor'), []);
assert.deepEqual(getRequiredDocumentKeys('manager'), [
  'company_registration',
  'insurance',
]);

const insuranceDoc: VerificationDocumentEntry = {
  key: 'insurance',
  label: 'Polisa ubezpieczeniowa',
  path: 'verification/user/insurance.pdf',
  filename: 'insurance.pdf',
  uploadedAt: '2026-08-20T10:00:00.000Z',
  viewUrl: 'https://example.test/insurance.pdf',
  downloadUrl: 'https://example.test/insurance.pdf',
};

const contractorMerged = mergeRequiredVerificationDocuments('contractor', [insuranceDoc]);
assert.equal(contractorMerged.length, 0);
assert.equal(
  contractorMerged.some((doc) => doc.key === 'insurance'),
  false,
);

const contractorMissing = mergeRequiredVerificationDocuments('contractor', []);
assert.equal(contractorMissing.length, 0);

const managerMerged = mergeRequiredVerificationDocuments('manager', [insuranceDoc]);
assert.equal(managerMerged.length, 2);
assert.equal(managerMerged[0]?.key, 'company_registration');
assert.equal(managerMerged[0]?.missing, true);
assert.equal(managerMerged[1]?.key, 'insurance');
assert.equal(managerMerged[1]?.missing, undefined);

const passingRegistry: CompanyRegistrySnapshot = {
  registrySource: 'ceidg',
  registryStatus: 'active',
  legalForm: 'JDG',
  krs: null,
  registryCheckedAt: '2026-08-20T00:00:00.000Z',
  financeRegistryStatus: 'solvent',
  financeRegistryCheckedAt: '2026-08-20T00:00:00.000Z',
  vatStatus: 'active_vat',
  vatWhitelistAccountAssigned: true,
};

const failedRegistry: CompanyRegistrySnapshot = {
  ...passingRegistry,
  registryStatus: 'suspended',
};

const adminApprovedWithoutRegistry = resolveVerificationStatus({
  userType: 'contractor',
  isVerified: true,
  submittedAt: null,
  registrySnapshot: failedRegistry,
});
assert.equal(adminApprovedWithoutRegistry.state, 'approved');

const adminApprovedNoSnapshot = resolveVerificationStatus({
  userType: 'contractor',
  isVerified: true,
  submittedAt: null,
  registrySnapshot: null,
});
assert.equal(adminApprovedNoSnapshot.state, 'approved');

const registryApproved = resolveVerificationStatus({
  userType: 'contractor',
  isVerified: false,
  submittedAt: null,
  registrySnapshot: passingRegistry,
});
assert.equal(registryApproved.state, 'approved');

const pendingReview = resolveVerificationStatus({
  userType: 'contractor',
  isVerified: false,
  submittedAt: '2026-08-20T12:00:00.000Z',
  registrySnapshot: failedRegistry,
});
assert.equal(pendingReview.state, 'pending');
assert.equal(pendingReview.submittedAt, '2026-08-20T12:00:00.000Z');

const unsubmitted = resolveVerificationStatus({
  userType: 'contractor',
  isVerified: false,
  submittedAt: null,
  registrySnapshot: failedRegistry,
});
assert.equal(unsubmitted.state, 'unsubmitted');

const rejected = resolveVerificationStatus({
  userType: 'contractor',
  isVerified: false,
  submittedAt: null,
  registrySnapshot: failedRegistry,
  latestDecision: {
    decision: 'rejected',
    reason: 'Nieczytelna polisa OC',
    created_at: '2026-08-19T12:00:00.000Z',
  },
});
assert.equal(rejected.state, 'rejected');
assert.equal(rejected.reason, 'Nieczytelna polisa OC');

console.log('opd177-contractor-verification tests passed');
