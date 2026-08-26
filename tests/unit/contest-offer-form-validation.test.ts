/**
 * Contest offer form field validation
 * (run: npx tsx tests/unit/contest-offer-form-validation.test.ts)
 */
import assert from 'node:assert/strict';
import {
  getContestOfferStepFieldErrors,
  localIsoDate,
} from '../../src/lib/contest-offer/offer-form-validation';
import { createEmptyContestOfferForm } from '../../src/types/contest-offer';
import type { ContestInfo } from '../../src/types/job';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_SELECTION_CRITERIA,
} from '../../src/types/tender-contest';

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
    formalRequirements: DEFAULT_FORMAL_REQUIREMENTS,
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

const info = contestInfo();
const empty = createEmptyContestOfferForm();

assert.equal(
  getContestOfferStepFieldErrors(2, empty, info).proposedCompletionDate,
  'Podaj oferowany termin wykonania',
);

const past = { ...empty, proposedCompletionDate: '2000-01-01' };
assert.equal(
  getContestOfferStepFieldErrors(2, past, info).proposedCompletionDate,
  'Termin wykonania nie może być w przeszłości',
);

const today = { ...empty, proposedCompletionDate: localIsoDate() };
assert.equal(
  getContestOfferStepFieldErrors(2, today, info).proposedCompletionDate,
  undefined,
);

const future = { ...empty, proposedCompletionDate: '2099-12-31' };
assert.equal(
  getContestOfferStepFieldErrors(2, future, info).proposedCompletionDate,
  undefined,
);

const belowMin = {
  ...empty,
  netPrice: '1000',
  warrantyMonths: '12',
  guaranteeMonths: '12',
};
const belowMinErrors = getContestOfferStepFieldErrors(4, belowMin, info);
assert.equal(belowMinErrors.warrantyMonths, 'Wybierz okres gwarancji');
assert.equal(belowMinErrors.guaranteeMonths, 'Wybierz okres rękojmi');

const atMin = {
  ...empty,
  netPrice: '1000',
  warrantyMonths: '24',
  guaranteeMonths: '24',
};
const atMinErrors = getContestOfferStepFieldErrors(4, atMin, info);
assert.equal(atMinErrors.warrantyMonths, undefined);
assert.equal(atMinErrors.guaranteeMonths, undefined);

const noMinInfo = contestInfo({ warrantyPeriod: 'none', guaranteePeriod: 'none' });
const twelveOk = getContestOfferStepFieldErrors(
  4,
  { ...empty, netPrice: '1000', warrantyMonths: '12', guaranteeMonths: '12' },
  noMinInfo,
);
assert.equal(twelveOk.warrantyMonths, undefined);
assert.equal(twelveOk.guaranteeMonths, undefined);

console.log('contest-offer-form-validation tests passed');
