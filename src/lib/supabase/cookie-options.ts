import type { CookieOptions } from '@supabase/ssr';

const isProduction = process.env.NODE_ENV === 'production';

/** Shared Supabase auth cookie options (OPD-114). HttpOnly is intentionally omitted — required by @supabase/ssr browser refresh. */
export const supabaseCookieOptions: CookieOptions = {
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};
