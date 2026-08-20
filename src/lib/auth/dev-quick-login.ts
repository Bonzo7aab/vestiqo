/**
 * Client-safe helpers for non-production one-click test logins.
 * Credentials live in `dev-quick-login-credentials.ts` (server-only import).
 */

export const PROD_SUPABASE_PROJECT_REF = 'fabbgaqxsetnsppxegnx';

export const DEV_QUICK_LOGIN_ACCOUNT_OPTIONS = [
  { key: 'admin', label: 'Admin' },
  { key: 'zarzadca1', label: 'Zarządca 1' },
  { key: 'zarzadca2', label: 'Zarządca 2' },
  { key: 'zarzadca3', label: 'Zarządca 3' },
  { key: 'wykonawca1', label: 'Wykonawca 1' },
  { key: 'wykonawca2', label: 'Wykonawca 2' },
  { key: 'wykonawca3', label: 'Wykonawca 3' },
] as const;

export type DevQuickLoginAccountKey =
  (typeof DEV_QUICK_LOGIN_ACCOUNT_OPTIONS)[number]['key'];

export function isDevQuickLoginAccountKey(
  value: string,
): value is DevQuickLoginAccountKey {
  return DEV_QUICK_LOGIN_ACCOUNT_OPTIONS.some((option) => option.key === value);
}

/** True for local `next dev` and Vercel Preview/Development — never Production. */
export function isDevQuickLoginEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
    return true;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'development') {
    return true;
  }
  return process.env.NODE_ENV === 'development';
}

export function isProductionSupabaseUrl(url: string | undefined): boolean {
  return Boolean(url?.includes(PROD_SUPABASE_PROJECT_REF));
}
