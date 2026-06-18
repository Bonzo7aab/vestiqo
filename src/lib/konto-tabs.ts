/** Polish `?tab=` slugs for `/konto`. */
export const KONTO_TABS = {
  profil: 'profil',
  twojeDane: 'twoje-dane',
  dokumenty: 'dokumenty',
  bezpieczenstwo: 'bezpieczenstwo',
  powiadomienia: 'powiadomienia',
} as const;

export type KontoTab = (typeof KONTO_TABS)[keyof typeof KONTO_TABS];

const ALL_KONTO_TABS = new Set<string>(Object.values(KONTO_TABS));

/** Legacy English slugs kept for old bookmarks and external links. */
const LEGACY_KONTO_TAB_ALIASES: Record<string, KontoTab> = {
  profile: KONTO_TABS.profil,
  company: KONTO_TABS.profil,
  firma: KONTO_TABS.profil,
  'contractor-data': KONTO_TABS.twojeDane,
  documents: KONTO_TABS.dokumenty,
  security: KONTO_TABS.bezpieczenstwo,
  notifications: KONTO_TABS.powiadomienia,
  'contractor-notifications': KONTO_TABS.powiadomienia,
};

export function normalizeKontoTabSlug(raw: string | null | undefined): KontoTab | null {
  if (!raw) return null;
  if (ALL_KONTO_TABS.has(raw)) {
    return raw as KontoTab;
  }
  return LEGACY_KONTO_TAB_ALIASES[raw] ?? null;
}

export function getDefaultKontoTab(userType: string | undefined): KontoTab {
  return userType === 'contractor' ? KONTO_TABS.twojeDane : KONTO_TABS.profil;
}

export function resolveKontoTabFromUrl(
  tabFromUrl: string | null,
  userType: string | undefined,
): KontoTab | null {
  const normalized = normalizeKontoTabSlug(tabFromUrl);
  if (!normalized) return null;

  if (
    (tabFromUrl === 'company' || tabFromUrl === 'firma') &&
    userType === 'contractor'
  ) {
    return KONTO_TABS.twojeDane;
  }

  if (normalized === KONTO_TABS.profil && userType === 'contractor') {
    return KONTO_TABS.twojeDane;
  }

  if (normalized === KONTO_TABS.dokumenty && userType === 'manager') {
    return KONTO_TABS.profil;
  }

  return normalized;
}

export function isDefaultKontoTab(tab: KontoTab, userType: string | undefined): boolean {
  return tab === getDefaultKontoTab(userType);
}

export function kontoHref(
  tab?: KontoTab,
  options?: { userType?: string; hash?: string; search?: Record<string, string> },
): string {
  const userType = options?.userType;
  const hash = options?.hash ?? '';
  const base = '/konto';

  if (!tab || isDefaultKontoTab(tab, userType)) {
    const params = options?.search ? new URLSearchParams(options.search) : null;
    const qs = params?.toString();
    if (qs) return `${base}?${qs}${hash}`;
    return `${base}${hash}`;
  }

  const params = new URLSearchParams({ tab, ...options?.search });
  return `${base}?${params.toString()}${hash}`;
}

/** Contractor verification documents tab. */
export const KONTO_DOKUMENTY_PATH = kontoHref(KONTO_TABS.dokumenty, { userType: 'contractor' });

/** Profile / company data — contractors land on „Twoje dane”, managers on „Profil”. */
export function kontoCompanyDataHref(userType: string | undefined): string {
  return userType === 'contractor'
    ? kontoHref(KONTO_TABS.twojeDane, { userType })
    : kontoHref(KONTO_TABS.profil, { userType });
}

export function contractorVerificationDocumentsHref(
  params?: Record<string, string>,
): string {
  return kontoHref(KONTO_TABS.dokumenty, { userType: 'contractor', search: params });
}
