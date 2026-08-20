/**
 * OPD-156 contest formal requirements vs contractor profile
 * (run: npx tsx tests/unit/contest-offer-opd156.test.ts)
 */
import assert from 'node:assert/strict';
import { formatFormalRequirementLines } from '../../src/lib/contest/format-formal-requirement-lines';
import {
  EMPTY_FORMAL_PROFILE_SNAPSHOT,
  validateProfileFormalRequirements,
  type ContractorFormalProfileSnapshot,
} from '../../src/lib/contest-offer/validate-profile-formal-requirements';
import { DEFAULT_FORMAL_REQUIREMENTS, type FormalRequirements } from '../../src/types/tender-contest';

const NOW = Date.parse('2026-08-16T12:00:00.000Z');

function snapshot(
  overrides: Partial<ContractorFormalProfileSnapshot> = {},
): ContractorFormalProfileSnapshot {
  return { ...EMPTY_FORMAL_PROFILE_SNAPSHOT, ...overrides };
}

function formal(overrides: FormalRequirements = {}): FormalRequirements {
  return { ...DEFAULT_FORMAL_REQUIREMENTS, ...overrides };
}

// --- OC ---

assert.equal(
  validateProfileFormalRequirements(formal({ insuranceOc: true }), snapshot(), NOW).insuranceOc,
  'Uzupełnij polisę OC w profilu',
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ insuranceOc: true }),
    snapshot({ hasOcScan: true }),
    NOW,
  ).insuranceOc,
  'Uzupełnij datę ważności polisy OC w profilu',
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ insuranceOc: true }),
    snapshot({ hasOcScan: true, ocValidUntil: '2026-07-01' }),
    NOW,
  ).insuranceOc?.includes('wygasła'),
  true,
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ insuranceOc: true, insuranceOcMinAmount: 1_000_000 }),
    snapshot({ hasOcScan: true, ocValidUntil: '2026-12-31' }),
    NOW,
  ).insuranceOc?.includes('niższa niż wymagane minimum'),
  true,
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ insuranceOc: true, insuranceOcMinAmount: 1_000_000 }),
    snapshot({ hasOcScan: true, ocValidUntil: '2026-12-31', ocGuaranteeAmount: 500_000 }),
    NOW,
  ).insuranceOc?.includes('500'),
  true,
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ insuranceOc: true, insuranceOcMinAmount: 1_000_000 }),
    snapshot({
      hasOcScan: true,
      ocValidUntil: '2026-12-31',
      ocGuaranteeAmount: 1_000_000,
    }),
    NOW,
  ).insuranceOc,
  undefined,
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ insuranceOc: true }),
    snapshot({ hasOcScan: true, ocValidUntil: '2026-08-20' }),
    NOW,
  ).insuranceOc,
  undefined,
);

// --- Certificates ---

assert.equal(
  validateProfileFormalRequirements(formal({ professionalCertificates: true }), snapshot(), NOW)
    .professionalCertificates,
  'Uzupełnij certyfikaty zawodowe w profilu',
);

assert.equal(
  validateProfileFormalRequirements(
    formal({ professionalCertificates: true }),
    snapshot({ hasCertificatesDoc: true }),
    NOW,
  ).professionalCertificates,
  undefined,
);

// --- Licenses ---

assert.equal(
  validateProfileFormalRequirements(formal({ professionalLicenses: true }), snapshot(), NOW)
    .professionalLicenses,
  undefined,
  'empty contest types keep file-only behavior',
);

assert.equal(
  validateProfileFormalRequirements(
    formal({
      professionalLicenses: true,
      professionalLicenseTypes: ['sep_g1_operation'],
    }),
    snapshot(),
    NOW,
  ).professionalLicenses,
  'Uzupełnij skan uprawnień zawodowych w profilu',
);

assert.equal(
  validateProfileFormalRequirements(
    formal({
      professionalLicenses: true,
      professionalLicenseTypes: ['sep_g1_operation'],
    }),
    snapshot({
      professionalQualificationsScanPath: 'scans/sep.pdf',
      professionalQualificationsValidUntil: '2026-01-01',
    }),
    NOW,
  ).professionalLicenses?.includes('wygasły'),
  true,
);

assert.equal(
  validateProfileFormalRequirements(
    formal({
      professionalLicenses: true,
      professionalLicenseTypes: ['sep_g1_operation', 'udt_elevators'],
    }),
    snapshot({
      professionalQualificationsScanPath: 'scans/sep.pdf',
      professionalQualificationTypes: ['sep_g1_operation'],
    }),
    NOW,
  ).professionalLicenses?.includes('UDT'),
  true,
);

assert.equal(
  validateProfileFormalRequirements(
    formal({
      professionalLicenses: true,
      professionalLicenseTypes: ['sep_g1_operation', 'udt_elevators'],
    }),
    snapshot({
      professionalQualificationsScanPath: 'scans/sep.pdf',
      professionalQualificationTypes: ['sep_g1_operation', 'udt_elevators', 'f_gas'],
    }),
    NOW,
  ).professionalLicenses,
  undefined,
);

// --- Requirement lines ---

assert.deepEqual(formatFormalRequirementLines(formal({ insuranceOc: true })), [
  'Aktualna polisa OC wykonawcy',
]);

assert.equal(
  formatFormalRequirementLines(formal({ insuranceOc: true, insuranceOcMinAmount: 1_000_000 }))[0]
    ?.includes('min.'),
  true,
);

assert.deepEqual(formatFormalRequirementLines(formal({ professionalLicenses: true })), [
  'Uprawnienia zawodowe',
]);

const licenseLines = formatFormalRequirementLines(
  formal({
    professionalLicenses: true,
    professionalLicenseTypes: ['sep_g1_operation', 'udt_elevators'],
  }),
);
assert.equal(licenseLines.length, 1);
assert.match(licenseLines[0] ?? '', /Uprawnienia zawodowe:/);
assert.match(licenseLines[0] ?? '', /SEP G1/);
assert.match(licenseLines[0] ?? '', /UDT/);

console.log('contest-offer-opd156.test.ts: ok');
