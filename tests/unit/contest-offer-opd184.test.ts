/**
 * OPD-184 professional licenses from verification certifications
 * (run: npx tsx tests/unit/contest-offer-opd184.test.ts)
 */
import assert from 'node:assert/strict';
import { applyProfileDocumentsToForm } from '../../src/lib/contest-offer/build-profile-formal-attachment';
import {
  formalSnapshotFromSources,
  professionalLicenseScanPath,
} from '../../src/lib/contest-offer/load-formal-profile-snapshot';
import { getContestOfferStepFieldErrors } from '../../src/lib/contest-offer/offer-form-validation';
import {
  EMPTY_FORMAL_PROFILE_SNAPSHOT,
  PROFILE_LICENSE_SCAN_MISSING,
  validateProfileFormalRequirements,
} from '../../src/lib/contest-offer/validate-profile-formal-requirements';
import { createEmptyContestOfferForm } from '../../src/types/contest-offer';
import type { ContestInfo } from '../../src/types/job';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_SELECTION_CRITERIA,
  type FormalRequirements,
} from '../../src/types/tender-contest';

const NOW = Date.parse('2026-08-27T12:00:00.000Z');
const CERT_PATH =
  'ec53e557-6819-4138-bd1e-707ad6e4cf61/weryfikacja/certifications/1787741835708-Uprawnienia_SEP.pdf';

const emptySettings = {
  ocGuaranteeAmount: null,
  ocValidUntil: null,
  ocPolicyScanPath: null,
  professionalQualificationTypes: [] as string[],
  professionalQualificationsScanPath: null as string | null,
  professionalQualificationsValidUntil: null as string | null,
};

function formal(overrides: FormalRequirements = {}): FormalRequirements {
  return { ...DEFAULT_FORMAL_REQUIREMENTS, ...overrides };
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

assert.equal(professionalLicenseScanPath(null, {}), null);
assert.equal(professionalLicenseScanPath(null, { certifications: CERT_PATH }), CERT_PATH);
assert.equal(
  professionalLicenseScanPath('contractors/u1/uprawnienia.pdf', { certifications: CERT_PATH }),
  'contractors/u1/uprawnienia.pdf',
);

const fromCertifications = formalSnapshotFromSources(
  {
    ...emptySettings,
    professionalQualificationTypes: [
      'building_exec_unlimited',
      'extinguisher_hydrant',
      'f_gas',
    ],
    professionalQualificationsValidUntil: '2026-09-03',
  },
  { certifications: CERT_PATH },
);
assert.equal(fromCertifications.professionalQualificationsScanPath, CERT_PATH);
assert.equal(fromCertifications.hasCertificatesDoc, true);

const licenseFormal = formal({
  professionalLicenses: true,
  professionalLicenseTypes: ['building_exec_unlimited', 'extinguisher_hydrant', 'f_gas'],
});
assert.equal(
  validateProfileFormalRequirements(licenseFormal, fromCertifications, NOW).professionalLicenses,
  undefined,
);

assert.equal(
  validateProfileFormalRequirements(
    licenseFormal,
    formalSnapshotFromSources(
      {
        ...emptySettings,
        professionalQualificationTypes: ['building_exec_unlimited'],
        professionalQualificationsValidUntil: '2026-09-03',
      },
      {},
    ),
    NOW,
  ).professionalLicenses,
  PROFILE_LICENSE_SCAN_MISSING,
);

const autofilled = applyProfileDocumentsToForm(
  [
    {
      requirementKey: 'professionalLicenses',
      label: 'Uprawnienia zawodowe',
      path: CERT_PATH,
      fileName: '1787741835708-Uprawnienia_SEP.pdf',
      signedUrl: null,
      hint: 'Ważne / wgrane: 03.09.2026',
      missing: false,
      profileBlocked: false,
    },
  ],
  {},
);
assert.equal(autofilled.professionalLicenses?.path, CERT_PATH);
assert.equal(autofilled.professionalLicenses?.source, 'profile');

const info = contestInfo({ formalRequirements: licenseFormal });
const formWithStaged = createEmptyContestOfferForm();
formWithStaged.stagedFiles.professionalLicenses = [
  { name: 'Uprawnienia_SEP.pdf', size: 12 } as File,
];

assert.equal(
  getContestOfferStepFieldErrors(3, createEmptyContestOfferForm(), info, {
    ...EMPTY_FORMAL_PROFILE_SNAPSHOT,
    professionalQualificationTypes: [
      'building_exec_unlimited',
      'extinguisher_hydrant',
      'f_gas',
    ],
    professionalQualificationsValidUntil: '2026-09-03',
  }).formal?.professionalLicenses,
  PROFILE_LICENSE_SCAN_MISSING,
);

assert.equal(
  getContestOfferStepFieldErrors(3, formWithStaged, info, {
    ...EMPTY_FORMAL_PROFILE_SNAPSHOT,
    professionalQualificationTypes: [
      'building_exec_unlimited',
      'extinguisher_hydrant',
      'f_gas',
    ],
    professionalQualificationsValidUntil: '2026-09-03',
  }).formal?.professionalLicenses,
  undefined,
);

assert.match(
  getContestOfferStepFieldErrors(3, formWithStaged, info, {
    ...EMPTY_FORMAL_PROFILE_SNAPSHOT,
    professionalQualificationTypes: ['building_exec_unlimited'],
    professionalQualificationsValidUntil: '2026-09-03',
  }).formal?.professionalLicenses ?? '',
  /brakuje wymaganych uprawnień/,
);

console.log('contest-offer-opd184.test.ts: ok');
