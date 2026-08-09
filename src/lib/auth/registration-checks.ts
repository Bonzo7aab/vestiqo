import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { normalizeNip } from '../gus/nip';
import { findAuthUserByEmail } from './find-user-by-email';

export type RegistrationDuplicateStatus = 'available' | 'taken' | 'unavailable';

function matchesNormalizedNip(
  value: string | null | undefined,
  normalized: string,
): boolean {
  return value != null && normalizeNip(String(value)) === normalized;
}

/**
 * Returns whether a NIP is already linked to a registered account.
 * On query failure returns `unavailable` (never pretend the NIP is taken).
 */
export async function checkNipRegistrationStatus(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<RegistrationDuplicateStatus> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return 'available';
  }

  const { data: profiles, error: profilesError } = await admin
    .from('user_profiles')
    .select('nip')
    .not('nip', 'is', null);

  if (profilesError) {
    console.error('NIP duplicate check (profiles) failed:', profilesError.message);
    return 'unavailable';
  }

  if ((profiles ?? []).some((row) => matchesNormalizedNip(row.nip, normalized))) {
    return 'taken';
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id, nip')
    .not('nip', 'is', null);

  if (companiesError) {
    console.error('NIP duplicate check (companies) failed:', companiesError.message);
    return 'unavailable';
  }

  for (const company of companies ?? []) {
    if (!matchesNormalizedNip(company.nip, normalized)) {
      continue;
    }

    const { count, error: linkError } = await admin
      .from('user_companies')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id);

    if (linkError) {
      console.error('NIP duplicate check (company links) failed:', linkError.message);
      return 'unavailable';
    }

    if ((count ?? 0) > 0) {
      return 'taken';
    }
  }

  return 'available';
}

/** @deprecated Prefer checkNipRegistrationStatus — boolean true on DB errors was misleading. */
export async function isNipAlreadyRegistered(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<boolean> {
  return (await checkNipRegistrationStatus(admin, nipInput)) === 'taken';
}

/**
 * Returns whether an auth user already exists for this email.
 * Uses admin email lookup (filter + paginated fallback).
 */
export async function checkEmailRegistrationStatus(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<RegistrationDuplicateStatus> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return 'available';
  }

  try {
    const existing = await findAuthUserByEmail(admin, normalizedEmail);
    return existing ? 'taken' : 'available';
  } catch (error) {
    console.error(
      'Email duplicate check failed:',
      error instanceof Error ? error.message : error,
    );
    return 'unavailable';
  }
}

/** @deprecated Prefer checkEmailRegistrationStatus. */
export async function isEmailAlreadyRegistered(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<boolean> {
  return (await checkEmailRegistrationStatus(admin, email)) === 'taken';
}
