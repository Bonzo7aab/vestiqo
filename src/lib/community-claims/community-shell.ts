import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { normalizeNip } from '../gus/nip';

export interface CommunityShellFields {
  nip: string;
  name: string;
  regon?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
}

export interface CommunityShellCandidate {
  id: string;
  nip: string | null;
  type: string;
  is_verified: boolean | null;
  is_public: boolean | null;
  linkedUserCount: number;
}

export type CommunityCompanyResolution =
  | { action: 'reuse'; companyId: string }
  | { action: 'create' };

function matchesNip(value: string | null | undefined, normalized: string): boolean {
  return value != null && normalizeNip(String(value)) === normalized;
}

/**
 * A registration shell is a wspólnota company with no login.
 * It is not an independent account until a user is linked.
 */
export function isUnclaimedCommunityShell(
  company: CommunityShellCandidate,
  nipInput: string,
): boolean {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return false;
  }

  return (
    matchesNip(company.nip, normalized) &&
    company.type.toLowerCase() === 'wspólnota' &&
    company.is_verified === false &&
    company.is_public === false &&
    company.linkedUserCount === 0
  );
}

export function communityCompanyHasIndependentLogin(company: CommunityShellCandidate): boolean {
  return company.type.toLowerCase() === 'wspólnota' && company.linkedUserCount > 0;
}

export function pickCommunityShellForClaim(
  candidates: CommunityShellCandidate[],
  nipInput: string,
): CommunityShellCandidate | null {
  return candidates.find((company) => isUnclaimedCommunityShell(company, nipInput)) ?? null;
}

export function resolveCommunityCompanyAction(
  candidates: CommunityShellCandidate[],
  nipInput: string,
): CommunityCompanyResolution {
  const shell = pickCommunityShellForClaim(candidates, nipInput);
  if (shell) {
    return { action: 'reuse', companyId: shell.id };
  }
  return { action: 'create' };
}

export function communityShellInsert(
  input: CommunityShellFields,
): Database['public']['Tables']['companies']['Insert'] {
  const nip = normalizeNip(input.nip);
  return {
    name: input.name.trim(),
    type: 'wspólnota',
    nip,
    regon: input.regon?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    postal_code: input.postal_code?.trim() || null,
    country: 'PL',
    email: null,
    phone: null,
    is_verified: false,
    verification_level: 'none',
    is_public: false,
  };
}

async function findCommunityShellCandidates(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<CommunityShellCandidate[] | null> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return [];
  }

  const { data: companies, error: companiesError } = await admin
    .from('companies')
    .select('id, nip, type, is_verified, is_public')
    .eq('nip', normalized);

  if (companiesError) {
    console.error('Community shell lookup failed:', companiesError.message);
    return null;
  }

  const rows = (companies ?? []).filter((company) => matchesNip(company.nip, normalized));
  if (rows.length === 0) {
    return [];
  }

  const { data: links, error: linksError } = await admin
    .from('user_companies')
    .select('company_id')
    .in(
      'company_id',
      rows.map((company) => company.id),
    );

  if (linksError) {
    console.error('Community shell link lookup failed:', linksError.message);
    return null;
  }

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    counts.set(link.company_id, (counts.get(link.company_id) ?? 0) + 1);
  }

  return rows.map((company) => ({
    id: company.id,
    nip: company.nip,
    type: company.type,
    is_verified: company.is_verified,
    is_public: company.is_public,
    linkedUserCount: counts.get(company.id) ?? 0,
  }));
}

export async function ensureUnclaimedCommunityShell(
  admin: SupabaseClient<Database>,
  input: CommunityShellFields,
): Promise<{ id: string } | { error: string }> {
  const nip = normalizeNip(input.nip);
  if (!nip || !input.name.trim()) {
    return { error: 'Brak danych wspólnoty do utworzenia konta.' };
  }

  const candidates = await findCommunityShellCandidates(admin, nip);
  if (!candidates) {
    return { error: 'Nie udało się sprawdzić konta wspólnoty.' };
  }

  const existing = pickCommunityShellForClaim(candidates, nip);
  if (existing) {
    return { id: existing.id };
  }

  const { data, error } = await admin
    .from('companies')
    .insert(communityShellInsert({ ...input, nip }))
    .select('id')
    .single();

  if (error || !data?.id) {
    return { error: error?.message ?? 'Nie udało się utworzyć konta wspólnoty.' };
  }

  return { id: data.id };
}

export async function findUnclaimedCommunityShell(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<{ shell: CommunityShellCandidate | null } | { error: string }> {
  const candidates = await findCommunityShellCandidates(admin, nipInput);
  if (!candidates) {
    return { error: 'Nie udało się wczytać konta wspólnoty.' };
  }
  return { shell: pickCommunityShellForClaim(candidates, nipInput) };
}

export async function activateCommunityShell(
  admin: SupabaseClient<Database>,
  companyId: string,
  input: CommunityShellFields & { email: string; phone: string },
): Promise<{ error?: string }> {
  const { error } = await admin
    .from('companies')
    .update({
      name: input.name.trim(),
      regon: input.regon?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      email: input.email,
      phone: input.phone,
      is_verified: true,
      verification_level: 'verified',
      is_public: true,
    })
    .eq('id', companyId);

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function revertCommunityShellActivation(
  admin: SupabaseClient<Database>,
  companyId: string,
): Promise<void> {
  const { error } = await admin
    .from('companies')
    .update({
      email: null,
      phone: null,
      is_verified: false,
      verification_level: 'none',
      is_public: false,
    })
    .eq('id', companyId);

  if (error) {
    console.error('Community shell revert failed:', error.message);
  }
}

export async function syncUnclaimedCommunityShell(
  admin: SupabaseClient<Database>,
  previousNip: string,
  next: CommunityShellFields,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const previous = normalizeNip(previousNip);
  const nextNip = normalizeNip(next.nip);
  if (!previous || !nextNip || !next.name.trim()) {
    return { ok: true };
  }

  const candidates = await findCommunityShellCandidates(admin, previous);
  if (!candidates) {
    return { ok: false, error: 'Nie udało się wczytać konta wspólnoty.' };
  }

  const shell = pickCommunityShellForClaim(candidates, previous);
  if (!shell) {
    return { ok: true };
  }

  if (nextNip !== previous) {
    const nextCandidates = await findCommunityShellCandidates(admin, nextNip);
    if (!nextCandidates) {
      return { ok: false, error: 'Nie udało się sprawdzić nowego NIP wspólnoty.' };
    }
    const conflict = nextCandidates.some((company) => company.id !== shell.id);
    if (conflict) {
      return { ok: false, error: 'NIP wspólnoty jest już używany przez inną firmę.' };
    }
  }

  const { error } = await admin
    .from('companies')
    .update({
      nip: nextNip,
      name: next.name.trim(),
      regon: next.regon?.trim() || null,
      address: next.address?.trim() || null,
      city: next.city?.trim() || null,
      postal_code: next.postal_code?.trim() || null,
    })
    .eq('id', shell.id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteUnclaimedCommunityShellIfOrphan(
  admin: SupabaseClient<Database>,
  nipInput: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeNip(nipInput);
  if (!normalized) {
    return { ok: true };
  }

  const { data: entities, error: entitiesError } = await admin
    .from('managed_housing_entities')
    .select('id, nip')
    .eq('nip', normalized);

  if (entitiesError) {
    return { ok: false, error: entitiesError.message };
  }

  const stillManaged = (entities ?? []).some((entity) => matchesNip(entity.nip, normalized));
  if (stillManaged) {
    return { ok: true };
  }

  const candidates = await findCommunityShellCandidates(admin, normalized);
  if (!candidates) {
    return { ok: false, error: 'Nie udało się wczytać konta wspólnoty.' };
  }

  const shells = candidates.filter((company) => isUnclaimedCommunityShell(company, normalized));
  for (const shell of shells) {
    const { error } = await admin.from('companies').delete().eq('id', shell.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}
