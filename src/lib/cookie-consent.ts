export const COOKIE_CONSENT_KEY = 'cookie-consent';

export const COOKIE_SETTINGS_EVENT = 'vestiqo:open-cookie-settings';

export const COOKIE_CONSENT_UPDATED_EVENT = 'vestiqo:cookie-consent-updated';

export interface CookiePreferences {
  essential: true;
  functional: boolean;
  analytics: boolean;
  updatedAt: string;
}

export function getDefaultCookiePreferences(): CookiePreferences {
  return {
    essential: true,
    functional: false,
    analytics: false,
    updatedAt: new Date().toISOString(),
  };
}

export function parseCookiePreferences(raw: string | null): CookiePreferences | null {
  if (!raw) return null;

  if (raw === 'accepted') {
    return {
      essential: true,
      functional: true,
      analytics: true,
      updatedAt: new Date().toISOString(),
    };
  }

  if (raw === 'declined') {
    return {
      essential: true,
      functional: false,
      analytics: false,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>;
    if (typeof parsed.functional !== 'boolean' || typeof parsed.analytics !== 'boolean') {
      return null;
    }
    return {
      essential: true,
      functional: parsed.functional,
      analytics: parsed.analytics,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  return parseCookiePreferences(localStorage.getItem(COOKIE_CONSENT_KEY));
}

export function saveCookiePreferences(preferences: Omit<CookiePreferences, 'essential' | 'updatedAt'>): CookiePreferences {
  const next: CookiePreferences = {
    essential: true,
    functional: preferences.functional,
    analytics: preferences.analytics,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_UPDATED_EVENT));
  }

  return next;
}

export function hasCookieConsentChoice(): boolean {
  return readCookiePreferences() !== null;
}

export function openCookieSettings(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
}
