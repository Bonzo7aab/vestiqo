/**
 * OPD-186: OC is contest-gated profile data, not admin verification.
 * (run: npx tsx tests/unit/contest-offer-opd186.test.ts)
 */
import assert from 'node:assert/strict';
import { getContestOfferStepFieldErrors } from '../../src/lib/contest-offer/offer-form-validation';
import {
  EMPTY_FORMAL_PROFILE_SNAPSHOT,
  ocFieldsFromSnapshot,
  overlayOfferOcOnSnapshot,
  validateProfileFormalRequirements,
  type ContractorFormalProfileSnapshot,
} from '../../src/lib/contest-offer/validate-profile-formal-requirements';
import { getRequiredDocumentKeys } from '../../src/lib/verification/required-documents';
import { createEmptyContestOfferForm } from '../../src/types/contest-offer';
import type { ContestInfo } from '../../src/types/job';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_SELECTION_CRITERIA,
} from '../../src/types/tender-contest';

const NOW = Date.parse('2026-09-03T12:00:00.000Z');

function snapshot(
  overrides: Partial<ContractorFormalProfileSnapshot> = {},
): ContractorFormalProfileSnapshot {
  return { ...EMPTY_FORMAL_PROFILE_SNAPSHOT, ...overrides };
}

function contestInfo(overrides: Partial<ContestInfo> = {}): ContestInfo {
  return {
    managedEntityId: null,
    entityName: null,
    entityAddress: null,
    documents: [],
    submissionDeadline: '2030-01-10T12:00:00.000Z',
    evaluationDeadline: null,
    completionDate: null,
    publishedAt: null,
    siteVisitType: 'not_required',
    siteVisitTypeLabel: '',
    siteVisitNotes: null,
    formalRequirements: {
      ...DEFAULT_FORMAL_REQUIREMENTS,
      insuranceOc: true,
      insuranceOcMinAmount: 1_000_000,
    },
    formalRequirementLines: [],
    selectionCriteria: DEFAULT_SELECTION_CRITERIA,
    warrantyPeriod: 'min_24',
    guaranteePeriod: 'min_24',
    depositRequired: false,
    depositAmount: null,
    depositInstructions: null,
    paymentTerms: { mode: 'standard_14' },
    paymentTermsLabel: '14 dni',
    ...overrides,
  };
}

assert.deepEqual(getRequiredDocumentKeys('contractor'), []);
assert.deepEqual(getRequiredDocumentKeys('manager'), ['company_registration', 'insurance']);

const profile = snapshot({
  hasOcScan: true,
  ocValidUntil: '2026-12-31',
  ocGuaranteeAmount: 200_000,
});
assert.deepEqual(ocFieldsFromSnapshot(profile), {
  ocValidUntil: '2026-12-31',
  ocGuaranteeAmount: '200000',
});

const form = createEmptyContestOfferForm();
form.ocValidUntil = '2027-06-01';
form.ocGuaranteeAmount = '1500000';
const stagedOc = [{} as File];
form.stagedFiles.insuranceOc = stagedOc;

const overlaid = overlayOfferOcOnSnapshot(
  snapshot({ hasOcScan: false, ocValidUntil: null, ocGuaranteeAmount: 100 }),
  form,
);
assert.equal(overlaid.hasOcScan, true);
assert.equal(overlaid.ocValidUntil, '2027-06-01');
assert.equal(overlaid.ocGuaranteeAmount, 1_500_000);
assert.equal(
  validateProfileFormalRequirements(
    contestInfo().formalRequirements,
    overlaid,
    NOW,
  ).insuranceOc,
  undefined,
);

const emptyOverlay = overlayOfferOcOnSnapshot(profile, createEmptyContestOfferForm());
assert.equal(emptyOverlay.hasOcScan, true);
assert.equal(emptyOverlay.ocValidUntil, '2026-12-31');
assert.equal(emptyOverlay.ocGuaranteeAmount, 200_000);

const offerForm = createEmptyContestOfferForm();
offerForm.ocValidUntil = '2027-01-01';
offerForm.ocGuaranteeAmount = '1500000';
offerForm.stagedFiles.insuranceOc = stagedOc;

const stepErrors = getContestOfferStepFieldErrors(
  3,
  offerForm,
  contestInfo(),
  snapshot({ hasOcScan: false, ocValidUntil: '2020-01-01', ocGuaranteeAmount: 1 }),
);
assert.equal(stepErrors.formal?.insuranceOc, undefined);

const lowSum = createEmptyContestOfferForm();
lowSum.ocValidUntil = '2027-01-01';
lowSum.ocGuaranteeAmount = '100';
lowSum.formalAttachments.insuranceOc = {
  id: 'oc',
  name: 'oc.pdf',
  path: 'offers/oc.pdf',
  type: 'document',
  source: 'override',
  requirementKey: 'insuranceOc',
};
const lowSumErrors = getContestOfferStepFieldErrors(
  3,
  lowSum,
  contestInfo(),
  snapshot({ hasOcScan: true }),
);
assert.equal(lowSumErrors.formal?.insuranceOc?.includes('niższa niż wymagane minimum'), true);

console.log('contest-offer-opd186.test.ts: ok');
