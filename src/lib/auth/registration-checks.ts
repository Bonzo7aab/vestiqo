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

async function companyHasLinkedUser(
  admin: SupabaseClient<Database>,
  companyId: string,
): Promise<RegistrationDuplicateStatus> {
  const { count, error } = await admin
    .from('user_companies')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('NIP duplicate check (company links) failed:', error.message);
    return 'unavailable';
  }

  return (count ?? 0) > 0 ? 'taken' : 'available';
}

/**
 * Returns whether a NIP is already linked to a registered account.
 * On query failure returns `unavailable` (never pretend the NIP is taken).
 *
 * Community NIPs live on `managed_housing_entities`, not only on companies.
 * Orphan rows (company/entity with no user_companies link) do not block signup —
 * leftover data after a failed account delete should not look like a transient outage.
 */
export async function checkNipRegistrationStatus(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<RegistrationDuplicateStatus> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return 'available';
  }

  let sawQueryFailure = false;

  const { data: profiles, error: profilesError } = await admin
    .from('user_profiles')
    .select('nip')
    .eq('nip', normalized);

  if (profilesError) {
    console.error('NIP duplicate check (profiles) failed:', profilesError.message);
    sawQueryFailure = true;
  } else if ((profiles ?? []).some((row) => matchesNormalizedNip(row.nip, normalized))) {
    return 'taken';
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id, nip')
    .eq('nip', normalized);

  if (companiesError) {
    console.error('NIP duplicate check (companies) failed:', companiesError.message);
    sawQueryFailure = true;
  } else {
    for (const company of companies ?? []) {
      if (!matchesNormalizedNip(company.nip, normalized)) {
        continue;
      }

      const linkStatus = await companyHasLinkedUser(admin, company.id);
      if (linkStatus === 'taken') {
        return 'taken';
      }
      if (linkStatus === 'unavailable') {
        sawQueryFailure = true;
      }
    }
  }

  const { data: housingEntities, error: housingError } = await admin
    .from('managed_housing_entities')
    .select('id, nip, manager_company_id')
    .eq('nip', normalized);

  if (housingError) {
    console.error('NIP duplicate check (housing entities) failed:', housingError.message);
    sawQueryFailure = true;
  } else {
    for (const entity of housingEntities ?? []) {
      if (!matchesNormalizedNip(entity.nip, normalized)) {
        continue;
      }

      const linkStatus = await companyHasLinkedUser(admin, entity.manager_company_id);
      if (linkStatus === 'taken') {
        return 'taken';
      }
      if (linkStatus === 'unavailable') {
        sawQueryFailure = true;
      }
    }
  }

  return sawQueryFailure ? 'unavailable' : 'available';
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
