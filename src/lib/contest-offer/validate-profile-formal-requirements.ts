import type { FormalRequirementKey } from '../../types/contest-offer';
import type { FormalRequirements } from '../../types/tender-contest';
import { professionalQualificationLabel } from '../contractor/constants';
import {
  requiredQualificationTypeIds,
  resolveQualificationDocumentPath,
  resolveQualificationValidUntil,
  type ProfessionalQualificationDocuments,
} from '../contractor/professional-qualification-documents';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ContractorFormalProfileSnapshot {
  ocGuaranteeAmount: number | null;
  ocValidUntil: string | null;
  hasOcScan: boolean;
  hasCertificatesDoc: boolean;
  professionalQualificationTypes: string[];
  professionalQualificationsScanPath: string | null;
  professionalQualificationsValidUntil: string | null;
  professionalQualificationDocuments: ProfessionalQualificationDocuments;
}

export const PROFILE_LICENSE_SCAN_MISSING =
  'Uzupełnij skan uprawnień zawodowych w profilu';

export const EMPTY_FORMAL_PROFILE_SNAPSHOT: ContractorFormalProfileSnapshot = {
  ocGuaranteeAmount: null,
  ocValidUntil: null,
  hasOcScan: false,
  hasCertificatesDoc: false,
  professionalQualificationTypes: [],
  professionalQualificationsScanPath: null,
  professionalQualificationsValidUntil: null,
  professionalQualificationDocuments: {},
};

function formatPln(amount: number): string {
  return `${amount.toLocaleString('pl-PL')} zł`;
}

function formatPlDate(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calendarDayUtc(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (match) {
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const parsed = new Date(ms);
  return Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function daysUntil(iso: string, nowMs: number): number | null {
  const validUntilDay = calendarDayUtc(iso);
  if (validUntilDay == null) return null;
  const now = new Date(nowMs);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((validUntilDay - today) / MS_PER_DAY);
}

function isExpired(iso: string | null, nowMs: number): boolean {
  if (!iso) return false;
  const daysLeft = daysUntil(iso, nowMs);
  return daysLeft != null && daysLeft < 0;
}

/**
 * Compares contest formal requirements with the contractor profile.
 * File attachments on the offer are validated separately.
 */
export function validateProfileFormalRequirements(
  formal: FormalRequirements,
  snapshot: ContractorFormalProfileSnapshot,
  nowMs: number = Date.now(),
): Partial<Record<FormalRequirementKey, string>> {
  const errors: Partial<Record<FormalRequirementKey, string>> = {};

  if (formal.insuranceOc) {
    if (!snapshot.hasOcScan) {
      errors.insuranceOc = 'Wgraj skan polisy OC';
    } else if (!snapshot.ocValidUntil) {
      errors.insuranceOc = 'Podaj datę ważności polisy OC';
    } else if (daysUntil(snapshot.ocValidUntil, nowMs) == null) {
      errors.insuranceOc = 'Podaj datę ważności polisy OC';
    } else if (isExpired(snapshot.ocValidUntil, nowMs)) {
      errors.insuranceOc = `Polisa OC wygasła (ważna do: ${formatPlDate(snapshot.ocValidUntil)}).`;
    } else if (
      formal.insuranceOcMinAmount != null &&
      formal.insuranceOcMinAmount > 0 &&
      (snapshot.ocGuaranteeAmount == null || snapshot.ocGuaranteeAmount < formal.insuranceOcMinAmount)
    ) {
      const profileSum =
        snapshot.ocGuaranteeAmount == null ? 'brak' : formatPln(snapshot.ocGuaranteeAmount);
      errors.insuranceOc = `Suma gwarancyjna OC (${profileSum}) jest niższa niż wymagane minimum (${formatPln(formal.insuranceOcMinAmount)}).`;
    }
  }

  if (formal.professionalCertificates && !formal.professionalLicenses && !snapshot.hasCertificatesDoc) {
    const types = requiredQualificationTypeIds(formal);
    if (types.length === 0) {
      errors.professionalCertificates = 'Uzupełnij certyfikaty zawodowe w profilu';
    }
  }

  if (formal.professionalLicenses || (formal.professionalCertificates && requiredQualificationTypeIds(formal).length > 0)) {
    const requiredTypes = requiredQualificationTypeIds(formal);
    if (requiredTypes.length > 0) {
      const owned = new Set(snapshot.professionalQualificationTypes);
      const missingTypes = requiredTypes.filter((id) => !owned.has(id));
      const missingFiles = requiredTypes.filter(
        (id) =>
          !resolveQualificationDocumentPath(
            id,
            snapshot.professionalQualificationDocuments,
            snapshot.professionalQualificationsScanPath,
            null,
          ),
      );
      const expired = requiredTypes.filter((id) => {
        const path = resolveQualificationDocumentPath(
          id,
          snapshot.professionalQualificationDocuments,
          snapshot.professionalQualificationsScanPath,
          null,
        );
        if (!path) return false;
        const until = resolveQualificationValidUntil(
          id,
          snapshot.professionalQualificationDocuments,
          snapshot.professionalQualificationsValidUntil,
        );
        return isExpired(until, nowMs);
      });

      if (
        missingFiles.length === requiredTypes.length &&
        !snapshot.professionalQualificationsScanPath
      ) {
        errors.professionalLicenses = PROFILE_LICENSE_SCAN_MISSING;
      } else if (missingFiles.length > 0) {
        const labels = missingFiles.map(professionalQualificationLabel).join(', ');
        errors.professionalLicenses = `W profilu brakuje skanów: ${labels}. Uzupełnij w profilu.`;
      } else if (expired.length > 0) {
        const firstUntil = resolveQualificationValidUntil(
          expired[0],
          snapshot.professionalQualificationDocuments,
          snapshot.professionalQualificationsValidUntil,
        );
        const until = firstUntil ? formatPlDate(firstUntil) : '';
        errors.professionalLicenses = `Uprawnienia zawodowe w profilu wygasły (ważne do: ${until}). Uzupełnij w profilu.`;
      } else if (missingTypes.length > 0) {
        const labels = missingTypes.map(professionalQualificationLabel).join(', ');
        errors.professionalLicenses = `W profilu brakuje wymaganych uprawnień: ${labels}. Uzupełnij w profilu.`;
      }
    }
  }

  return errors;
}

export function parseOcGuaranteeAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function ocFieldsFromSnapshot(
  snapshot: ContractorFormalProfileSnapshot,
): { ocValidUntil: string; ocGuaranteeAmount: string } {
  return {
    ocValidUntil: snapshot.ocValidUntil ?? '',
    ocGuaranteeAmount:
      snapshot.ocGuaranteeAmount != null ? String(snapshot.ocGuaranteeAmount) : '',
  };
}

/**
 * Overlay offer-form OC date/sum and a newly staged/attached scan onto the
 * profile snapshot so contest validation can pass without a profile round-trip.
 */
export function overlayOfferOcOnSnapshot(
  snapshot: ContractorFormalProfileSnapshot,
  form: {
    ocValidUntil: string;
    ocGuaranteeAmount: string;
    formalAttachments: Partial<Record<FormalRequirementKey, { path?: string } | undefined>>;
    stagedFiles: Partial<Record<FormalRequirementKey | string, File[] | undefined>>;
  },
): ContractorFormalProfileSnapshot {
  const hasOfferScan = Boolean(
    form.formalAttachments.insuranceOc || form.stagedFiles.insuranceOc?.length,
  );
  const parsedAmount = parseOcGuaranteeAmountInput(form.ocGuaranteeAmount);
  return {
    ...snapshot,
    hasOcScan: snapshot.hasOcScan || hasOfferScan,
    ocValidUntil: form.ocValidUntil.trim() || snapshot.ocValidUntil,
    ocGuaranteeAmount: parsedAmount ?? snapshot.ocGuaranteeAmount,
  };
}
