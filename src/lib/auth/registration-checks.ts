import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { normalizeNip } from '../gus/nip';

export async function isNipAlreadyRegistered(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<boolean> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return false;
  }

  const { data: companies, error } = await admin
    .from('companies')
    .select('nip')
    .not('nip', 'is', null);

  if (error) {
    console.error('NIP duplicate check failed:', error.message);
    return false;
  }

  return (companies ?? []).some(
    row => row.nip != null && normalizeNip(String(row.nip)) === normalized,
  );
}

export async function isEmailAlreadyRegistered(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return false;
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    console.error('Email duplicate check failed:', error.message);
    return false;
  }

  return (data.users ?? []).some(
    user => user.email?.trim().toLowerCase() === normalizedEmail,
  );
}
