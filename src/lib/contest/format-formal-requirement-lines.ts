import { professionalQualificationLabel } from '../contractor/constants';
import type { FormalRequirements } from '../../types/tender-contest';

export function formatFormalRequirementLines(formal: FormalRequirements): string[] {
  const lines: string[] = [];
  if (formal.insuranceOc) {
    const min = formal.insuranceOcMinAmount
      ? ` (min. ${formal.insuranceOcMinAmount.toLocaleString('pl-PL')} zł)`
      : '';
    lines.push(`Aktualna polisa OC wykonawcy${min}`);
  }
  if (formal.zusUsCertificates) {
    lines.push('Zaświadczenia o niezaleganiu w ZUS i US (nie starsze niż 3 miesiące)');
  }
  if (formal.references) {
    const min = formal.referencesMinCount ?? 2;
    const years = formal.referencesYears ?? 3;
    lines.push(`Referencje – min. ${min} podobne realizacje z ostatnich ${years} lat`);
  }
  if (formal.professionalCertificates) {
    lines.push('Certyfikaty zawodowe');
  }
  if (formal.professionalLicenses) {
    const types = formal.professionalLicenseTypes ?? [];
    if (types.length === 0) {
      lines.push('Uprawnienia zawodowe');
    } else {
      const labels = types.map(professionalQualificationLabel);
      lines.push(`Uprawnienia zawodowe: ${labels.join(', ')}`);
    }
  }
  return lines;
}
