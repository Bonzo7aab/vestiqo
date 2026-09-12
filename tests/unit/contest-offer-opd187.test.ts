/**
 * OPD-187 configurable offer documents
 * (run: npx tsx tests/unit/contest-offer-opd187.test.ts)
 */
import assert from 'node:assert/strict';
import {
  getContestOfferStepFieldErrors,
  normalizeContestOfferWizardStep,
} from '../../src/lib/contest-offer/offer-form-validation';
import { formatFormalRequirementLines } from '../../src/lib/contest/format-formal-requirement-lines';
import { getTenderContestFormFieldErrors } from '../../src/lib/contest/contest-form-validation';
import { mergeFlatAttachmentsIntoForm } from '../../src/lib/contest-offer/merge-flat-attachments';
import {
  createEmptyContestOfferForm,
  hasOfferDocumentFile,
} from '../../src/types/contest-offer';
import type { ContestInfo } from '../../src/types/job';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_SELECTION_CRITERIA,
  parseOfferDocuments,
  requiredOfferDocuments,
  type TenderContestFormData,
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
    formalRequirements: { ...DEFAULT_FORMAL_REQUIREMENTS, offerDocuments: [] },
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

function contestForm(overrides: Partial<TenderContestFormData> = {}): TenderContestFormData {
  return {
    title: 'Malowanie ławek',
    description: 'Prosty zakres prac na terenie osiedla testowego',
    managedEntityId: 'entity-1',
    category: 'elektryka',
    subcategory: 'instalacje',
    submissionDeadline: new Date('2030-01-10T12:00:00.000Z'),
    evaluationDeadline: new Date('2030-01-20T12:00:00.000Z'),
    completionDate: new Date('2030-02-01T12:00:00.000Z'),
    siteVisitType: 'not_required',
    siteVisitNotes: '',
    formalRequirements: { ...DEFAULT_FORMAL_REQUIREMENTS, offerDocuments: [] },
    selectionCriteria: DEFAULT_SELECTION_CRITERIA,
    warrantyPeriod: 'min_24',
    guaranteePeriod: 'min_24',
    depositRequired: false,
    depositAmount: null,
    depositInstructions: '',
    paymentTerms: { mode: 'standard_14' },
    ...overrides,
  };
}

assert.deepEqual(parseOfferDocuments(undefined), []);
assert.deepEqual(parseOfferDocuments(null), []);
assert.deepEqual(parseOfferDocuments('nope'), []);
assert.deepEqual(parseOfferDocuments([{ id: 'kosztorys', name: 'Kosztorys' }, 'x', null]), [
  { id: 'kosztorys', name: 'Kosztorys' },
]);
assert.deepEqual(
  parseOfferDocuments([
    { id: 'kosztorys', name: 'Kosztorys' },
    { id: 'kosztorys', name: 'Duplikat' },
  ]),
  [{ id: 'kosztorys', name: 'Kosztorys' }],
);
assert.deepEqual(parseOfferDocuments([{ id: 'custom-1', name: '  ' }]), [
  { id: 'custom-1', name: '' },
]);
assert.deepEqual(
  requiredOfferDocuments({
    offerDocuments: [
      { id: 'kosztorys', name: 'Kosztorys' },
      { id: 'custom-1', name: '' },
    ],
  }),
  [{ id: 'kosztorys', name: 'Kosztorys' }],
);

assert.deepEqual(
  parseOfferDocuments([
    { id: 'opis-techniczny', name: 'Opis techniczny' },
    { junk: true },
  ]),
  [
    { id: 'opis-techniczny', name: 'Opis techniczny' },
    { id: 'custom-1', name: '' },
  ],
);

const empty = createEmptyContestOfferForm();
assert.equal(
  getContestOfferStepFieldErrors(1, empty, contestInfo()).proposedCompletionDate,
  'Podaj oferowany termin wykonania',
);

assert.equal(normalizeContestOfferWizardStep(1, 1), 1);
assert.equal(normalizeContestOfferWizardStep(2, 1), 1);
assert.equal(normalizeContestOfferWizardStep(3, 1), 2);
assert.equal(normalizeContestOfferWizardStep(4, 1), 3);
assert.equal(normalizeContestOfferWizardStep(1, 2), 1);
assert.equal(normalizeContestOfferWizardStep(2, 2), 2);
assert.equal(normalizeContestOfferWizardStep(3, 2), 3);

const withNamed = contestInfo({
  formalRequirements: {
    ...DEFAULT_FORMAL_REQUIREMENTS,
    offerDocuments: [
      { id: 'kosztorys', name: 'Kosztorys' },
      { id: 'custom-1', name: 'Projekt zamienny' },
    ],
  },
});
const missingNamed = getContestOfferStepFieldErrors(2, empty, withNamed);
assert.equal(missingNamed.offerDocuments?.kosztorys, 'Wgraj plik: Kosztorys');
assert.equal(missingNamed.offerDocuments?.['custom-1'], 'Wgraj plik: Projekt zamienny');

const staged = createEmptyContestOfferForm();
staged.stagedOfferDocumentFiles = {
  kosztorys: { name: 'kosztorys.pdf' } as File,
};
staged.extraAttachments = [
  {
    id: 'att-1',
    name: 'projekt.pdf',
    path: 'bids/projekt.pdf',
    type: 'document',
    source: 'override',
    requirementKey: 'offerDocumentation',
    offerDocumentId: 'custom-1',
    offerDocumentName: 'Projekt zamienny',
  },
];
assert.equal(hasOfferDocumentFile(staged, 'kosztorys'), true);
assert.equal(hasOfferDocumentFile(staged, 'custom-1'), true);
assert.equal(getContestOfferStepFieldErrors(2, staged, withNamed).offerDocuments, undefined);

const lines = formatFormalRequirementLines({
  insuranceOc: true,
  offerDocuments: [
    { id: 'kosztorys', name: 'Kosztorys' },
    { id: 'custom-1', name: 'Projekt zamienny' },
    { id: 'blank', name: '' },
  ],
});
assert.ok(lines.includes('Aktualna polisa OC wykonawcy'));
assert.ok(lines.includes('Kosztorys'));
assert.ok(lines.includes('Projekt zamienny'));
assert.equal(lines.includes(''), false);

const blankNameErrors = getTenderContestFormFieldErrors(
  contestForm({
    formalRequirements: {
      ...DEFAULT_FORMAL_REQUIREMENTS,
      offerDocuments: [{ id: 'custom-1', name: '   ' }],
    },
  }),
  [{ name: 'spec.pdf' } as File],
  [],
  true,
  'active',
);
assert.equal(blankNameErrors.offerDocumentItems?.['custom-1'], 'Podaj nazwę dokumentu');

const validNamedErrors = getTenderContestFormFieldErrors(
  contestForm({
    formalRequirements: {
      ...DEFAULT_FORMAL_REQUIREMENTS,
      offerDocuments: [{ id: 'kosztorys', name: 'Kosztorys' }],
    },
  }),
  [{ name: 'spec.pdf' } as File],
  [],
  true,
  'active',
);
assert.equal(validNamedErrors.offerDocumentItems, undefined);

const hydrated = createEmptyContestOfferForm();
mergeFlatAttachmentsIntoForm(hydrated, [
  {
    id: '1',
    name: 'kosztorys.xlsx',
    path: 'bids/kosztorys.xlsx',
    type: 'document',
    requirementKey: 'offerDocumentation',
    offerDocumentId: 'kosztorys',
    offerDocumentName: 'Kosztorys',
  },
]);
assert.equal(hydrated.extraAttachments[0]?.offerDocumentId, 'kosztorys');
assert.equal(hydrated.extraAttachments[0]?.offerDocumentName, 'Kosztorys');

console.log('contest-offer-opd187.test.ts: ok');
