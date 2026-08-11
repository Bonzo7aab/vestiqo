/**
 * Seeded vestiqo-test accounts (see scripts/reset-test-accounts.ts).
 * Import only from server code — never from client components.
 */
import type { DevQuickLoginAccountKey } from './dev-quick-login';

const DEV_QUICK_LOGIN_PASSWORD = 'Test12!@';

const DEV_QUICK_LOGIN_CREDENTIALS: Record<
  DevQuickLoginAccountKey,
  { email: string; password: string }
> = {
  admin: { email: 'admin@vestiqo.pl', password: DEV_QUICK_LOGIN_PASSWORD },
  zarzadca1: {
    email: 'zarzadca1@vestiqo.pl',
    password: DEV_QUICK_LOGIN_PASSWORD,
  },
  zarzadca2: {
    email: 'zarzadca2@vestiqo.pl',
    password: DEV_QUICK_LOGIN_PASSWORD,
  },
  zarzadca3: {
    email: 'zarzadca3@vestiqo.pl',
    password: DEV_QUICK_LOGIN_PASSWORD,
  },
  wykonawca1: {
    email: 'wykonawca1@vestiqo.pl',
    password: DEV_QUICK_LOGIN_PASSWORD,
  },
  wykonawca2: {
    email: 'wykonawca2@vestiqo.pl',
    password: DEV_QUICK_LOGIN_PASSWORD,
  },
  wykonawca3: {
    email: 'wykonawca3@vestiqo.pl',
    password: DEV_QUICK_LOGIN_PASSWORD,
  },
};

export function getDevQuickLoginCredentials(
  key: DevQuickLoginAccountKey,
): { email: string; password: string } {
  return DEV_QUICK_LOGIN_CREDENTIALS[key];
}
