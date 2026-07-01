import type { KrsLifecycleStatus } from '../registry/types';

interface KrsRawProceeding {
  rodzajPostepowania?: string;
}

interface KrsRawDzial6 {
  postepowanieUpadlosciowe?: unknown[];
  postepowanieRestrukturyzacyjneNaprawczePrzymusowaRestrukturyzacjaUporzadkowanaLikwidacja?: KrsRawProceeding[];
  wykreslenia?: unknown[];
}

function isLiquidationKind(label: string | undefined): boolean {
  if (!label) {
    return false;
  }
  const upper = label.toUpperCase();
  return upper.includes('LIKWIDAC');
}

function parseDzial6Status(dzial6: KrsRawDzial6 | undefined): KrsLifecycleStatus {
  if (!dzial6) {
    return 'active';
  }

  if (dzial6.wykreslenia?.length) {
    return 'dissolved';
  }

  if (dzial6.postepowanieUpadlosciowe?.length) {
    return 'bankruptcy';
  }

  const combined = dzial6.postepowanieRestrukturyzacyjneNaprawczePrzymusowaRestrukturyzacjaUporzadkowanaLikwidacja ?? [];
  if (combined.length) {
    const hasLiquidation = combined.some(entry => isLiquidationKind(entry.rodzajPostepowania));
    return hasLiquidation ? 'liquidating' : 'restructuring';
  }

  return 'active';
}

function parseNameSuffixStatus(name: string | null | undefined): KrsLifecycleStatus | null {
  if (!name) {
    return null;
  }
  const upper = name.toUpperCase();
  if (upper.includes('W UPADŁOŚCI') || upper.includes('W UPADLOSCI')) {
    return 'bankruptcy';
  }
  if (upper.includes('W LIKWIDACJI')) {
    return 'liquidating';
  }
  return null;
}

export function parseKrsLifecycleStatus(
  dzial6: KrsRawDzial6 | undefined,
  registeredName: string | null | undefined,
): KrsLifecycleStatus {
  const fromDzial6 = parseDzial6Status(dzial6);
  if (fromDzial6 !== 'active') {
    return fromDzial6;
  }

  return parseNameSuffixStatus(registeredName) ?? 'active';
}

export function mapKrsLifecycleToBusinessStatus(
  lifecycle: KrsLifecycleStatus,
): 'active' | 'suspended' | 'closed' | 'unknown' {
  switch (lifecycle) {
    case 'active':
    case 'restructuring':
      return 'active';
    case 'bankruptcy':
    case 'liquidating':
      return 'suspended';
    case 'dissolved':
      return 'closed';
    default:
      return 'unknown';
  }
}

export function isKrsInsolvent(lifecycle: KrsLifecycleStatus): boolean {
  return lifecycle === 'bankruptcy' || lifecycle === 'liquidating' || lifecycle === 'dissolved';
}
