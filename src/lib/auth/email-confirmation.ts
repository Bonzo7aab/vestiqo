import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

export function isAuthUserEmailConfirmed(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return Boolean(user.email_confirmed_at);
}

/**
 * Loads email confirmation flags for admin views (service role required).
 */
export async function fetchEmailConfirmationByUserIds(
  admin: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, boolean>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const result = new Map<string, boolean>();

  if (uniqueIds.length === 0) {
    return result;
  }

  await Promise.all(
    uniqueIds.map(async userId => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        console.error('[fetchEmailConfirmationByUserIds] getUserById failed', {
          userId,
          message: error.message,
        });
        result.set(userId, false);
        return;
      }

      result.set(userId, isAuthUserEmailConfirmed(data.user));
    }),
  );

  return result;
}
