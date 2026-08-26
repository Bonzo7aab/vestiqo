import type { FormalRequirementKey } from '../../types/contest-offer';
import type { FormalRequirements } from '../../types/tender-contest';
import { professionalQualificationLabel } from '../contractor/constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ContractorFormalProfileSnapshot {
  ocGuaranteeAmount: number | null;
  ocValidUntil: string | null;
  hasOcScan: boolean;
  hasCertificatesDoc: boolean;
  professionalQualificationTypes: string[];
  professionalQualificationsScanPath: string | null;
  professionalQualificationsValidUntil: string | null;
}

export const EMPTY_FORMAL_PROFILE_SNAPSHOT: ContractorFormalProfileSnapshot = {
  ocGuaranteeAmount: null,
  ocValidUntil: null,
  hasOcScan: false,
  hasCertificatesDoc: false,
  professionalQualificationTypes: [],
  professionalQualificationsScanPath: null,
  professionalQualificationsValidUntil: null,
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
      errors.insuranceOc = 'Uzupełnij polisę OC w profilu';
    } else if (!snapshot.ocValidUntil) {
      errors.insuranceOc = 'Uzupełnij datę ważności polisy OC w profilu';
    } else if (daysUntil(snapshot.ocValidUntil, nowMs) == null) {
      errors.insuranceOc = 'Uzupełnij datę ważności polisy OC w profilu';
    } else if (isExpired(snapshot.ocValidUntil, nowMs)) {
      errors.insuranceOc = `Polisa OC w profilu wygasła (ważna do: ${formatPlDate(snapshot.ocValidUntil)}). Uzupełnij w profilu.`;
    } else if (
      formal.insuranceOcMinAmount != null &&
      formal.insuranceOcMinAmount > 0 &&
      (snapshot.ocGuaranteeAmount == null || snapshot.ocGuaranteeAmount < formal.insuranceOcMinAmount)
    ) {
      const profileSum =
        snapshot.ocGuaranteeAmount == null ? 'brak' : formatPln(snapshot.ocGuaranteeAmount);
      errors.insuranceOc = `Suma gwarancyjna OC w profilu (${profileSum}) jest niższa niż wymagane minimum (${formatPln(formal.insuranceOcMinAmount)}). Uzupełnij w profilu.`;
    }
  }

  if (formal.professionalCertificates && !snapshot.hasCertificatesDoc) {
    errors.professionalCertificates = 'Uzupełnij certyfikaty zawodowe w profilu';
  }

  if (formal.professionalLicenses) {
    const requiredTypes = formal.professionalLicenseTypes ?? [];
    if (requiredTypes.length > 0) {
      if (!snapshot.professionalQualificationsScanPath) {
        errors.professionalLicenses = 'Uzupełnij skan uprawnień zawodowych w profilu';
      } else if (isExpired(snapshot.professionalQualificationsValidUntil, nowMs)) {
        const until = snapshot.professionalQualificationsValidUntil
          ? formatPlDate(snapshot.professionalQualificationsValidUntil)
          : '';
        errors.professionalLicenses = `Uprawnienia zawodowe w profilu wygasły (ważne do: ${until}). Uzupełnij w profilu.`;
      } else {
        const owned = new Set(snapshot.professionalQualificationTypes);
        const missing = requiredTypes.filter((id) => !owned.has(id));
        if (missing.length > 0) {
          const labels = missing.map(professionalQualificationLabel).join(', ');
          errors.professionalLicenses = `W profilu brakuje wymaganych uprawnień: ${labels}. Uzupełnij w profilu.`;
        }
      }
    }
  }

  return errors;
}
