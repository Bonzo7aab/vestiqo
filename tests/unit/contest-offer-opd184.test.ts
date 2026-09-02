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
import {
  createEmptyContestOfferForm,
  toSerializableClientData,
} from '../../src/types/contest-offer';
import type { ContestInfo } from '../../src/types/job';
import {
  DEFAULT_FORMAL_REQUIREMENTS,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_SELECTION_CRITERIA,
  parseSelectionCriteria,
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
      label: 'Certyfikaty i uprawnienia',
      path: CERT_PATH,
      fileName: '1787741835708-Uprawnienia_SEP.pdf',
      signedUrl: null,
      hint: 'Ważne / wgrane: 03.09.2026',
      missing: false,
      profileBlocked: false,
    },
  ],
  { formalAttachments: {}, qualificationAttachments: [] },
);
assert.equal(autofilled.formalAttachments.professionalLicenses?.path, CERT_PATH);
assert.equal(autofilled.formalAttachments.professionalLicenses?.source, 'profile');

const info = contestInfo({ formalRequirements: licenseFormal });
const formWithStaged = createEmptyContestOfferForm();
formWithStaged.stagedQualificationFiles = {
  building_exec_unlimited: { name: 'Uprawnienia_SEP.pdf', size: 12 } as File,
  extinguisher_hydrant: { name: 'hydrant.pdf', size: 12 } as File,
  f_gas: { name: 'fgaz.pdf', size: 12 } as File,
};

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

function hasUndefined(value: unknown, path = 'root'): string | null {
  if (value === undefined) return path;
  if (value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = hasUndefined(value[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value)) {
    const found = hasUndefined(nested, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

assert.equal(hasUndefined(DEFAULT_FORMAL_REQUIREMENTS), null);
assert.equal(hasUndefined(DEFAULT_PAYMENT_TERMS), null);
assert.equal('customDays' in DEFAULT_PAYMENT_TERMS, false);
assert.equal('insuranceOcMinAmount' in DEFAULT_FORMAL_REQUIREMENTS, false);

const criteriaWithoutDescription = parseSelectionCriteria({
  items: [{ id: 'price', name: 'Cena', weight: 100, type: 'price' }],
});
assert.equal('description' in (criteriaWithoutDescription.items[0] ?? {}), false);
assert.equal(hasUndefined(criteriaWithoutDescription), null);

const submitPayload = toSerializableClientData({
  ...info,
  formalRequirements: { ...DEFAULT_FORMAL_REQUIREMENTS, professionalLicenses: true },
  paymentTerms: { ...DEFAULT_PAYMENT_TERMS },
  selectionCriteria: DEFAULT_SELECTION_CRITERIA,
});
assert.equal(hasUndefined(submitPayload), null);
assert.deepEqual(JSON.parse(JSON.stringify(submitPayload)), submitPayload);

console.log('contest-offer-opd184.test.ts: ok');
