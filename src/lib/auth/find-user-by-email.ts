import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { resolveElevatedSupabaseKeyForLookup } from '../supabase/admin';

const USERS_PER_PAGE = 1000;

interface AdminUsersResponse {
  users?: User[];
}

/**
 * Finds an auth user by email using the admin API.
 * Prefers the Auth REST filter endpoint (single lookup); falls back to paginated listUsers.
 */
export async function findAuthUserByEmail(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const viaFilter = await findAuthUserByEmailViaFilter(normalizedEmail);
  if (viaFilter !== undefined) {
    return viaFilter;
  }

  return findAuthUserByEmailViaListUsers(admin, normalizedEmail);
}

async function findAuthUserByEmailViaFilter(
  normalizedEmail: string,
): Promise<User | null | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const elevatedKey = resolveElevatedSupabaseKeyForLookup();

  if (!supabaseUrl || !elevatedKey) {
    return undefined;
  }

  try {
    const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users`);
    url.searchParams.set('filter', normalizedEmail);
    url.searchParams.set('per_page', '10');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${elevatedKey}`,
        apikey: elevatedKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        'findAuthUserByEmail: filter lookup failed:',
        response.status,
        text.slice(0, 500),
      );
      return undefined;
    }

    const body = (await response.json()) as AdminUsersResponse;
    const match = (body.users ?? []).find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );
    return match ?? null;
  } catch (error) {
    console.error('findAuthUserByEmail: filter lookup threw:', error);
    return undefined;
  }
}

async function findAuthUserByEmailViaListUsers(
  admin: SupabaseClient<Database>,
  normalizedEmail: string,
): Promise<User | null> {
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
