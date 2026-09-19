import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

export function isAuthUserEmailConfirmed(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return Boolean(user.email_confirmed_at);
}

export interface AuthUserAdminMeta {
  email: string | null;
  emailConfirmed: boolean;
}

/**
 * Loads auth email + confirmation flags for admin views (service role required).
 */
export async function fetchAuthUserMetaByUserIds(
  admin: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, AuthUserAdminMeta>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const result = new Map<string, AuthUserAdminMeta>();

  if (uniqueIds.length === 0) {
    return result;
  }

  await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        console.error('[fetchAuthUserMetaByUserIds] getUserById failed', {
          userId,
          message: error.message,
        });
        result.set(userId, { email: null, emailConfirmed: false });
        return;
      }

      result.set(userId, {
        email: data.user?.email ?? null,
        emailConfirmed: isAuthUserEmailConfirmed(data.user),
      });
    }),
  );

  return result;
}

/** @deprecated Use fetchAuthUserMetaByUserIds */
export async function fetchEmailConfirmationByUserIds(
  admin: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, boolean>> {
  const meta = await fetchAuthUserMetaByUserIds(admin, userIds);
  return new Map([...meta.entries()].map(([id, value]) => [id, value.emailConfirmed]));
}

export interface ProfileEmailVerifiedLookup {
  available: boolean;
  byUserId: Map<string, string | null>;
}

/**
 * App-level email confirmation timestamps. Fail-open when the column is missing
 * so production stays usable until the migration is applied.
 */
export async function fetchProfileEmailVerifiedAtByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<ProfileEmailVerifiedLookup> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const byUserId = new Map<string, string | null>();

  if (uniqueIds.length === 0) {
    return { available: true, byUserId };
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email_verified_at')
    .in('id', uniqueIds);

  if (error) {
    console.error('[fetchProfileEmailVerifiedAtByUserIds]', error.message);
    return { available: false, byUserId };
  }

  for (const row of data ?? []) {
    byUserId.set(row.id, row.email_verified_at ?? null);
  }

  return { available: true, byUserId };
}
