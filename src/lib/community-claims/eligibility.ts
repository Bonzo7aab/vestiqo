import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { ACCOUNT_ROLES } from '../profile/account-role-labels';
import { normalizeNip } from '../gus/nip';
import type { CommunityClaimEligibilityReason } from './constants';

export interface ManagedEntityClaimTarget {
  id: string;
  nip: string;
  name: string;
  entity_type: string;
  manager_company_id: string;
  management_blocked_at: string | null;
  claimed_company_id: string | null;
}

export interface CommunityClaimEligibility {
  reason: CommunityClaimEligibilityReason;
  entity: ManagedEntityClaimTarget | null;
}

function matchesNormalizedNip(value: string | null | undefined, normalized: string): boolean {
  return value != null && normalizeNip(String(value)) === normalized;
}

async function companyHasLinkedUser(
  admin: SupabaseClient<Database>,
  companyId: string,
): Promise<boolean | null> {
  const { count, error } = await admin
    .from('user_companies')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('Community claim eligibility (company links) failed:', error.message);
    return null;
  }

  return (count ?? 0) > 0;
}

/**
 * A NIP already has an independent Wspólnota login when a linked `wspólnota`
 * company or a condo_board profile exists for that NIP.
 */
export async function nipHasIndependentCondoBoardAccount(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<boolean | null> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return false;
  }

  const { data: profiles, error: profilesError } = await admin
    .from('user_profiles')
    .select('nip, account_role')
    .eq('nip', normalized);

  if (profilesError) {
    console.error('Community claim eligibility (profiles) failed:', profilesError.message);
    return null;
  }

  if (
    (profiles ?? []).some(
      (row) =>
        matchesNormalizedNip(row.nip, normalized) && row.account_role === ACCOUNT_ROLES.CONDO_BOARD,
    )
  ) {
    return true;
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id, nip, type')
    .eq('nip', normalized);

  if (companiesError) {
    console.error('Community claim eligibility (companies) failed:', companiesError.message);
    return null;
  }

  for (const company of companies ?? []) {
    if (!matchesNormalizedNip(company.nip, normalized)) {
      continue;
    }
    if ((company.type ?? '').toLowerCase() !== 'wspólnota') {
      continue;
    }
    const linked = await companyHasLinkedUser(admin, company.id);
    if (linked == null) {
      return null;
    }
    if (linked) {
      return true;
    }
  }

  return false;
}

export async function findManagedHousingEntityByNip(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<ManagedEntityClaimTarget | null> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return null;
  }

  const { data, error } = await admin
    .from('managed_housing_entities')
    .select(
      'id, nip, name, entity_type, manager_company_id, management_blocked_at, claimed_company_id',
    )
    .eq('nip', normalized);

  if (error) {
    console.error('Community claim eligibility (entities) failed:', error.message);
    throw error;
  }

  const match = (data ?? []).find((row) => matchesNormalizedNip(row.nip, normalized));
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    nip: match.nip,
    name: match.name,
    entity_type: match.entity_type,
    manager_company_id: match.manager_company_id,
    management_blocked_at: match.management_blocked_at,
    claimed_company_id: match.claimed_company_id,
  };
}

export async function hasPendingCommunityClaim(
  admin: SupabaseClient<Database>,
  managedEntityId: string,
): Promise<boolean> {
  const { count, error } = await admin
    .from('community_account_claims')
    .select('id', { count: 'exact', head: true })
    .eq('managed_entity_id', managedEntityId)
    .eq('status', 'pending');

  if (error) {
    console.error('Community claim eligibility (pending) failed:', error.message);
    throw error;
  }

  return (count ?? 0) > 0;
}

export async function resolveCommunityClaimEligibility(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<CommunityClaimEligibility> {
  const entity = await findManagedHousingEntityByNip(admin, nipInput);
  if (!entity) {
    return { reason: 'not_found', entity: null };
  }
  if (entity.entity_type !== 'wspólnota') {
    return { reason: 'not_wspolnota', entity };
  }
  if (entity.management_blocked_at) {
    return { reason: 'blocked', entity };
  }

  const hasOwnAccount = await nipHasIndependentCondoBoardAccount(admin, entity.nip);
  if (hasOwnAccount == null) {
    return { reason: 'not_found', entity };
  }
  if (hasOwnAccount) {
    return { reason: 'has_condo_board', entity };
  }

  if (await hasPendingCommunityClaim(admin, entity.id)) {
    return { reason: 'pending_exists', entity };
  }

  return { reason: 'ok', entity };
}
