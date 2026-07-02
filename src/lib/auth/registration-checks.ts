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

  const matchesNip = (value: string | null | undefined): boolean =>
    value != null && normalizeNip(String(value)) === normalized;

  const { data: profiles, error: profilesError } = await admin
    .from('user_profiles')
    .select('nip')
    .not('nip', 'is', null);

  if (profilesError) {
    console.error('NIP duplicate check (profiles) failed:', profilesError.message);
    return true;
  }

  if ((profiles ?? []).some(row => matchesNip(row.nip))) {
    return true;
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id, nip')
    .not('nip', 'is', null);

  if (companiesError) {
    console.error('NIP duplicate check (companies) failed:', companiesError.message);
    return true;
  }

  for (const company of companies ?? []) {
    if (!matchesNip(company.nip)) {
      continue;
    }

    const { count, error: linkError } = await admin
      .from('user_companies')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id);

    if (linkError) {
      console.error('NIP duplicate check (company links) failed:', linkError.message);
      return true;
    }

    if ((count ?? 0) > 0) {
      return true;
    }
  }

  return false;
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
