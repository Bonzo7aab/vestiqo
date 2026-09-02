/**
 * OPD-185 per-type certificate/qualification files
 * (run: npx tsx tests/unit/contest-offer-opd185.test.ts)
 */
import assert from 'node:assert/strict';
import { applyProfileDocumentsToForm } from '../../src/lib/contest-offer/build-profile-formal-attachment';
import { formatFormalRequirementLines } from '../../src/lib/contest/format-formal-requirement-lines';
import { getTenderContestFormFieldErrors } from '../../src/lib/contest/contest-form-validation';
import { mergeFlatAttachmentsIntoForm } from '../../src/lib/contest-offer/merge-flat-attachments';
import {
  parseProfessionalQualificationDocuments,
  requiredQualificationTypeIds,
  requiresCertificatesAndLicenses,
  resolveQualificationDocumentPath,
} from '../../src/lib/contractor/professional-qualification-documents';
import {
  EMPTY_FORMAL_PROFILE_SNAPSHOT,
  validateProfileFormalRequirements,
} from '../../src/lib/contest-offer/validate-profile-formal-requirements';
import {
  createEmptyContestOfferForm,
  mergeAttachmentsForBid,
  requiredFormalKeys,
} from '../../src/types/contest-offer';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_SELECTION_CRITERIA,
  type TenderContestFormData,
} from '../../src/types/tender-contest';

const parsed = parseProfessionalQualificationDocuments({
  sep_g1_operation: {
    path: 'u1/weryfikacja/qualifications/sep_g1_operation/a.pdf',
    fileName: 'sep.pdf',
    validUntil: '2027-06-01',
  },
  unknown_type: { path: 'x.pdf', fileName: 'x.pdf' },
  bad: 'nope',
});
assert.deepEqual(Object.keys(parsed), ['sep_g1_operation']);
assert.equal(parsed.sep_g1_operation?.fileName, 'sep.pdf');
assert.equal(parsed.sep_g1_operation?.validUntil, '2027-06-01');

assert.equal(
  resolveQualificationDocumentPath('sep_g1_operation', parsed, 'shared.pdf', 'certs.pdf'),
  parsed.sep_g1_operation?.path,
);
assert.equal(
  resolveQualificationDocumentPath('udt_elevators', parsed, 'shared.pdf', 'certs.pdf'),
  'shared.pdf',
);
assert.equal(resolveQualificationDocumentPath('udt_elevators', {}, null, 'certs.pdf'), 'certs.pdf');

const unified = {
  ...DEFAULT_FORMAL_REQUIREMENTS,
  professionalLicenses: true,
  professionalLicenseTypes: ['sep_g1_operation', 'udt_elevators'],
};
assert.equal(requiresCertificatesAndLicenses(unified), true);
assert.deepEqual(requiredQualificationTypeIds(unified), ['sep_g1_operation', 'udt_elevators']);
assert.deepEqual(requiredFormalKeys(unified), ['professionalLicenses']);
assert.deepEqual(
  requiredFormalKeys({ ...DEFAULT_FORMAL_REQUIREMENTS, professionalCertificates: true }),
  ['professionalLicenses'],
);
assert.deepEqual(
  requiredFormalKeys({
    ...DEFAULT_FORMAL_REQUIREMENTS,
    professionalCertificates: true,
    professionalLicenses: true,
  }),
  ['professionalLicenses'],
);

const lines = formatFormalRequirementLines(unified);
assert.equal(lines.length, 1);
assert.match(lines[0] ?? '', /Certyfikaty i uprawnienia:/);
assert.match(lines[0] ?? '', /SEP G1/);
assert.match(lines[0] ?? '', /UDT/);

const autofilled = applyProfileDocumentsToForm(
  [
    {
      requirementKey: 'professionalLicenses',
      qualificationTypeId: 'sep_g1_operation',
      label: 'SEP G1',
      path: 'scans/sep.pdf',
      fileName: 'sep.pdf',
      signedUrl: null,
      hint: null,
      missing: false,
      profileBlocked: false,
    },
    {
      requirementKey: 'professionalLicenses',
      qualificationTypeId: 'udt_elevators',
      label: 'UDT',
      path: 'scans/udt.pdf',
      fileName: 'udt.pdf',
      signedUrl: null,
      hint: null,
      missing: false,
      profileBlocked: false,
    },
  ],
  { formalAttachments: {}, qualificationAttachments: [] },
);
assert.equal(autofilled.qualificationAttachments.length, 2);
assert.equal(autofilled.qualificationAttachments[0]?.qualificationTypeId, 'sep_g1_operation');
assert.equal(autofilled.qualificationAttachments[1]?.qualificationTypeId, 'udt_elevators');

const alreadyFilled = applyProfileDocumentsToForm(
  [
    {
      requirementKey: 'professionalLicenses',
      qualificationTypeId: 'sep_g1_operation',
      label: 'SEP G1',
      path: 'scans/sep-new.pdf',
      fileName: 'sep-new.pdf',
      signedUrl: null,
      hint: null,
      missing: false,
      profileBlocked: false,
    },
  ],
  autofilled,
);
assert.equal(alreadyFilled.qualificationAttachments[0]?.path, 'scans/sep.pdf');

const form = createEmptyContestOfferForm();
form.qualificationAttachments = autofilled.qualificationAttachments;
const merged = mergeAttachmentsForBid(form);
assert.equal(merged.length, 2);

const hydrated = createEmptyContestOfferForm();
mergeFlatAttachmentsIntoForm(hydrated, [
  {
    id: '1',
    name: 'sep.pdf',
    path: 'scans/sep.pdf',
    type: 'document',
    requirementKey: 'professionalLicenses',
    qualificationTypeId: 'sep_g1_operation',
  },
  {
    id: '2',
    name: 'udt.pdf',
    path: 'scans/udt.pdf',
    type: 'document',
    requirementKey: 'professionalLicenses',
    qualificationTypeId: 'udt_elevators',
  },
]);
assert.equal(hydrated.qualificationAttachments.length, 2);
assert.equal(hydrated.qualificationAttachments[0]?.qualificationTypeId, 'sep_g1_operation');
assert.equal(hydrated.qualificationAttachments[1]?.qualificationTypeId, 'udt_elevators');

assert.equal(
  validateProfileFormalRequirements(
    unified,
    {
      ...EMPTY_FORMAL_PROFILE_SNAPSHOT,
      professionalQualificationTypes: ['sep_g1_operation', 'udt_elevators'],
      professionalQualificationDocuments: parsed,
    },
    Date.parse('2026-08-16T12:00:00.000Z'),
  ).professionalLicenses?.includes('skanów'),
  true,
);

assert.equal(
  validateProfileFormalRequirements(
    unified,
    {
      ...EMPTY_FORMAL_PROFILE_SNAPSHOT,
      professionalQualificationTypes: ['sep_g1_operation', 'udt_elevators'],
      professionalQualificationDocuments: {
        sep_g1_operation: parsed.sep_g1_operation!,
        udt_elevators: { path: 'scans/udt.pdf', fileName: 'udt.pdf', validUntil: null },
      },
    },
    Date.parse('2026-08-16T12:00:00.000Z'),
  ).professionalLicenses,
  undefined,
);

const contestForm = {
  title: 'Test',
  description: 'Opis konkursu testowego wystarczająco długi',
  managedEntityId: 'entity-1',
  category: 'elektryka',
  subcategory: 'instalacje',
  submissionDeadline: new Date('2030-01-10T12:00:00.000Z'),
  evaluationDeadline: new Date('2030-01-20T12:00:00.000Z'),
  completionDate: new Date('2030-02-01T12:00:00.000Z'),
  siteVisitType: 'not_required',
  siteVisitNotes: '',
  formalRequirements: {
    ...DEFAULT_FORMAL_REQUIREMENTS,
    professionalCertificates: true,
  },
  selectionCriteria: DEFAULT_SELECTION_CRITERIA,
  warrantyPeriod: 'min_24',
  guaranteePeriod: 'min_24',
  depositRequired: false,
  depositAmount: null,
  depositInstructions: '',
  paymentTerms: { mode: 'standard_14' },
} as TenderContestFormData;

const contestErrors = getTenderContestFormFieldErrors(
  contestForm,
  [],
  [],
  true,
  'active',
);
assert.equal(
  contestErrors.professionalLicenseTypes,
  'Zaznacz wymagane typy certyfikatów i uprawnień',
);

console.log('contest-offer-opd185.test.ts: ok');
