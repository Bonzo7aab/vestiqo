import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { isValidNip, normalizeNip } from '../gus/nip';
import { findUnclaimedCommunityShell } from '../community-claims/community-shell';
import {
  findManagedHousingEntityByNip,
  nipHasIndependentCondoBoardAccount,
} from '../community-claims/eligibility';

export interface NipLogin {
  userId: string;
  email: string;
  companyIds: string[];
}

export type NipRecoveryResolution =
  | { kind: 'community_claim' }
  | { kind: 'email_reset'; email: string; userId: string }
  | { kind: 'not_found' }
  | { error: string };

function matchesNip(value: string | null | undefined, normalized: string): boolean {
  return value != null && normalizeNip(String(value)) === normalized;
}

export async function findNipLogin(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<{ login: NipLogin | null } | { error: string }> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return { login: null };
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id, nip')
    .eq('nip', normalized);

  if (companiesError) {
    console.error('NIP recovery company lookup failed:', companiesError.message);
    return { error: 'Nie udało się sprawdzić konta. Spróbuj ponownie.' };
  }

  const companyIds = (companies ?? [])
    .filter((company) => matchesNip(company.nip, normalized))
    .map((company) => company.id);

  if (companyIds.length === 0) {
    return { login: null };
  }

  const { data: links, error: linksError } = await admin
    .from('user_companies')
    .select('user_id, company_id, is_primary, is_active')
    .in('company_id', companyIds);

  if (linksError) {
    console.error('NIP recovery membership lookup failed:', linksError.message);
    return { error: 'Nie udało się sprawdzić konta. Spróbuj ponownie.' };
  }

  const active = (links ?? []).filter((link) => link.is_active !== false && link.user_id);
  const primary = active.find((link) => link.is_primary) ?? active[0];
  if (!primary?.user_id) {
    return { login: null };
  }

  const { data: authUser, error: authError } = await admin.auth.admin.getUserById(primary.user_id);
  if (authError) {
    console.error('NIP recovery auth lookup failed:', authError.message);
    return { error: 'Nie udało się sprawdzić konta. Spróbuj ponownie.' };
  }

  const email = authUser.user?.email?.trim().toLowerCase();
  if (!email) {
    return { login: null };
  }

  return {
    login: {
      userId: primary.user_id,
      email,
      companyIds: [...new Set(active.map((link) => link.company_id).filter(Boolean))],
    },
  };
}

async function isManagerCreatedCommunityWithoutLogin(
  admin: SupabaseClient<Database>,
  nip: string,
): Promise<boolean | { error: string }> {
  const shell = await findUnclaimedCommunityShell(admin, nip);
  if ('error' in shell) {
    return { error: shell.error };
  }
  if (shell.shell) {
    return true;
  }

  let entity;
  try {
    entity = await findManagedHousingEntityByNip(admin, nip);
  } catch (error) {
    console.error('NIP recovery entity lookup failed:', error);
    return { error: 'Nie udało się sprawdzić konta. Spróbuj ponownie.' };
  }

  if (!entity || entity.entity_type !== 'wspólnota' || entity.management_blocked_at) {
    return false;
  }

  const { data: manager, error: managerError } = await admin
    .from('companies')
    .select('id, type')
    .eq('id', entity.manager_company_id)
    .maybeSingle();

  if (managerError) {
    console.error('NIP recovery manager lookup failed:', managerError.message);
    return { error: 'Nie udało się sprawdzić konta. Spróbuj ponownie.' };
  }

  if ((manager?.type ?? '').toLowerCase() !== 'property_management') {
    return false;
  }

  const hasOwnAccount = await nipHasIndependentCondoBoardAccount(admin, nip);
  if (hasOwnAccount == null) {
    return { error: 'Nie udało się sprawdzić konta. Spróbuj ponownie.' };
  }

  return !hasOwnAccount;
}

export async function resolveNipRecovery(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<NipRecoveryResolution> {
  const nip = normalizeNip(nipInput);
  if (!isValidNip(nip)) {
    return { error: 'Podaj prawidłowy numer NIP.' };
  }

  const loginResult = await findNipLogin(admin, nip);
  if ('error' in loginResult) {
    return { error: loginResult.error };
  }
  if (loginResult.login) {
    return {
      kind: 'email_reset',
      email: loginResult.login.email,
      userId: loginResult.login.userId,
    };
  }

  const community = await isManagerCreatedCommunityWithoutLogin(admin, nip);
  if (typeof community !== 'boolean') {
    return { error: community.error };
  }
  if (community) {
    return { kind: 'community_claim' };
  }

  return { kind: 'not_found' };
}
