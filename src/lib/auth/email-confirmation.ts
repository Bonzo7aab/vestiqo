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
