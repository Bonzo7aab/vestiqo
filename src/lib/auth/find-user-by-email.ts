import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

const USERS_PER_PAGE = 1000;

/**
 * Finds an auth user by email using the admin API (paginated listUsers).
 */
export async function findAuthUserByEmail(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });

    if (error) {
      console.error('findAuthUserByEmail: listUsers failed:', error.message);
      return null;
    }

    const match = (data.users ?? []).find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (match) {
      return match;
    }

    if ((data.users ?? []).length < USERS_PER_PAGE) {
      return null;
    }

    page += 1;
  }
}
