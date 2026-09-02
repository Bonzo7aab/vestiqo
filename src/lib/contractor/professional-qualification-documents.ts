import {
  ALL_PROFESSIONAL_QUALIFICATION_IDS,
  parseProfessionalLicenseTypes,
} from './constants';
import type { FormalRequirements } from '../../types/tender-contest';

export const CERTIFICATES_AND_LICENSES_LABEL = 'Certyfikaty i uprawnienia';

export interface ProfessionalQualificationDocument {
  path: string;
  fileName: string;
  validUntil: string | null;
}

export type ProfessionalQualificationDocuments = Record<
  string,
  ProfessionalQualificationDocument
>;

const ALLOWED_TYPE_IDS = new Set<string>(ALL_PROFESSIONAL_QUALIFICATION_IDS);

function asDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

export function parseProfessionalQualificationDocuments(
  raw: unknown,
): ProfessionalQualificationDocuments {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return {};
  }

  const result: ProfessionalQualificationDocuments = {};
  for (const [typeId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_TYPE_IDS.has(typeId)) continue;
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.path !== 'string' || !record.path.trim()) continue;
    const fileName =
      typeof record.fileName === 'string' && record.fileName.trim()
        ? record.fileName.trim()
        : record.path.split('/').pop() ?? record.path;
    result[typeId] = {
      path: record.path.trim(),
      fileName,
      validUntil: asDateOnly(record.validUntil),
    };
  }
  return result;
}

export function requiresCertificatesAndLicenses(formal: FormalRequirements): boolean {
  return Boolean(formal.professionalCertificates || formal.professionalLicenses);
}

export function requiredQualificationTypeIds(formal: FormalRequirements): string[] {
  if (!requiresCertificatesAndLicenses(formal)) return [];
  return parseProfessionalLicenseTypes(formal.professionalLicenseTypes);
}

export function resolveQualificationDocumentPath(
  typeId: string | undefined,
  documents: ProfessionalQualificationDocuments,
  fallbackScanPath: string | null | undefined,
  verificationCertificationsPath: string | null | undefined,
): string | null {
  if (typeId) {
    const dedicated = documents[typeId]?.path;
    if (dedicated) return dedicated;
  }
  if (fallbackScanPath) return fallbackScanPath;
  if (verificationCertificationsPath) return verificationCertificationsPath;
  return null;
}

export function resolveQualificationValidUntil(
  typeId: string | undefined,
  documents: ProfessionalQualificationDocuments,
  fallbackValidUntil: string | null | undefined,
): string | null {
  if (typeId) {
    const dedicated = documents[typeId]?.validUntil;
    if (dedicated) return dedicated;
  }
  return fallbackValidUntil ?? null;
}

export function collectQualificationDocumentPaths(
  documents: ProfessionalQualificationDocuments,
): string[] {
  return Object.values(documents)
    .map((doc) => doc.path)
    .filter((path) => path.trim().length > 0);
}

export function isAllowedQualificationTypeId(typeId: string): boolean {
  return ALLOWED_TYPE_IDS.has(typeId);
}
