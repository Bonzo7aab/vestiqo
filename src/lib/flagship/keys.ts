/** Flag keys in Cloudflare Flagship (kebab-case). */
export const FLAGSHIP_FLAG_KEYS = {
  NEW_TENDER_SYSTEM: 'new-tender-system',
  ENHANCED_MAP: 'enhanced-map',
  ADVANCED_FILTERS: 'advanced-filters',
  MOBILE_OPTIMIZATIONS: 'mobile-optimizations',
  ORDERS: 'orders',
  CONTRACTOR_SERVICES: 'contractor-services',
  CALENDAR: 'calendar',
} as const;

export type FlagshipFlagKey = (typeof FLAGSHIP_FLAG_KEYS)[keyof typeof FLAGSHIP_FLAG_KEYS];

const FLAGSHIP_FLAG_KEY_SET = new Set<string>(Object.values(FLAGSHIP_FLAG_KEYS));

export function isFlagshipFlagKey(key: string): key is FlagshipFlagKey {
  return FLAGSHIP_FLAG_KEY_SET.has(key);
}

/** Human-readable labels for the admin and testing UI. */
export const FLAGSHIP_FLAG_LABELS: Record<FlagshipFlagKey, string> = {
  [FLAGSHIP_FLAG_KEYS.NEW_TENDER_SYSTEM]: 'Nowy system przetargów',
  [FLAGSHIP_FLAG_KEYS.ENHANCED_MAP]: 'Ulepszona mapa',
  [FLAGSHIP_FLAG_KEYS.ADVANCED_FILTERS]: 'Zaawansowane filtry',
  [FLAGSHIP_FLAG_KEYS.MOBILE_OPTIMIZATIONS]: 'Optymalizacje mobile',
  [FLAGSHIP_FLAG_KEYS.ORDERS]: 'Zamówienia',
  [FLAGSHIP_FLAG_KEYS.CONTRACTOR_SERVICES]: 'Usługi wykonawcy',
  [FLAGSHIP_FLAG_KEYS.CALENDAR]: 'Kalendarz',
};

export const FLAGSHIP_FLAG_DESCRIPTIONS: Record<FlagshipFlagKey, string> = {
  [FLAGSHIP_FLAG_KEYS.NEW_TENDER_SYSTEM]: 'Ulepszona wersja systemu przetargowego',
  [FLAGSHIP_FLAG_KEYS.ENHANCED_MAP]: 'Nowa wersja mapy z dodatkowymi funkcjami',
  [FLAGSHIP_FLAG_KEYS.ADVANCED_FILTERS]: 'Dodatkowe opcje filtrowania zgłoszeń',
  [FLAGSHIP_FLAG_KEYS.MOBILE_OPTIMIZATIONS]: 'Ulepszenia dla urządzeń mobilnych',
  [FLAGSHIP_FLAG_KEYS.ORDERS]: 'Moduł zamówień dla zarządców i wykonawców',
  [FLAGSHIP_FLAG_KEYS.CONTRACTOR_SERVICES]: 'Zakładka Usługi (cennik) w panelu wykonawcy',
  [FLAGSHIP_FLAG_KEYS.CALENDAR]: 'Kalendarz wydarzeń i przeglądów w panelu zarządcy',
};

export const TESTING_FEATURE_FLAG_KEYS: readonly FlagshipFlagKey[] = [
  FLAGSHIP_FLAG_KEYS.NEW_TENDER_SYSTEM,
  FLAGSHIP_FLAG_KEYS.ENHANCED_MAP,
  FLAGSHIP_FLAG_KEYS.ADVANCED_FILTERS,
  FLAGSHIP_FLAG_KEYS.MOBILE_OPTIMIZATIONS,
  FLAGSHIP_FLAG_KEYS.ORDERS,
  FLAGSHIP_FLAG_KEYS.CONTRACTOR_SERVICES,
  FLAGSHIP_FLAG_KEYS.CALENDAR,
];

export type TestingFeatureFlags = Record<FlagshipFlagKey, boolean>;
