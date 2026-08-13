import { KONTO_TABS, normalizeKontoTabSlug } from './konto-tabs';

export const CONTRACTOR_SERVICES_GATE_PATH = '/konto';

const LEGAL_PATHS = new Set([
  '/regulamin',
  '/polityka-prywatnosci',
  '/ustawienia-plikow-cookie',
]);

export function isContractorServicesTab(tab: string | null | undefined): boolean {
  const normalized = normalizeKontoTabSlug(tab);
  return normalized === KONTO_TABS.uslugi;
}

/**
 * Paths a contractor may visit before saving at least one service.
 */
export function isContractorServicesGateExemptPath(
  pathname: string,
  tab?: string | null,
): boolean {
  if (pathname.startsWith('/auth/')) {
    return true;
  }
  if (pathname.startsWith('/api/')) {
    return true;
  }
  if (LEGAL_PATHS.has(pathname)) {
    return true;
  }
  if (pathname === '/konto' || pathname.startsWith('/konto/')) {
    return isContractorServicesTab(tab);
  }
  return false;
}

export function contractorServicesGateSearch(onboarding?: boolean): string {
  const params = new URLSearchParams({ tab: KONTO_TABS.uslugi });
  if (onboarding) {
    params.set('onboarding', '1');
  }
  return params.toString();
}
