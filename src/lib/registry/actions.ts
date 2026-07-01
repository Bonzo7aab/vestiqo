'use server';

import { createClient } from '../supabase/server';
import { fetchUserPrimaryCompany } from '../database/companies';
import { normalizeNip, isValidNip } from '../gus/nip';
import { loadCompanyRegistrySnapshotForUser } from './load-snapshot-for-user';
import { shouldRefreshRegistry, syncRegistryFromNip } from './sync-registry-from-nip';
import type { CompanyRegistrySnapshot } from './types';

export type VerifyCompanyRegistryResult =
  | { ok: true; snapshot: CompanyRegistrySnapshot }
  | { ok: false; error: string };

export async function verifyCompanyRegistryAction(
  nipInput?: string,
  options?: { force?: boolean },
): Promise<VerifyCompanyRegistryResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Musisz być zalogowany.' };
  }

  const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);
  if (!company) {
    return { ok: false, error: 'Nie znaleziono firmy powiązanej z kontem.' };
  }

  const nip = normalizeNip(nipInput ?? company.nip ?? '');
  if (!isValidNip(nip)) {
    return { ok: false, error: 'Brak prawidłowego numeru NIP firmy.' };
  }

  const needsRefresh =
    options?.force === true || shouldRefreshRegistry(company.registry_checked_at);

  if (needsRefresh) {
    const syncResult = await syncRegistryFromNip(supabase, {
      userId: user.id,
      companyId: company.id,
      normalizedNip: nip,
    });

    if (!syncResult.ok) {
      return { ok: false, error: syncResult.error ?? 'Nie udało się zweryfikować rejestru.' };
    }
  }

  const snapshot = await loadCompanyRegistrySnapshotForUser(supabase, user.id);
  if (!snapshot) {
    return { ok: false, error: 'Nie udało się wczytać danych rejestrowych.' };
  }

  return { ok: true, snapshot };
}

export async function getCompanyRegistrySnapshotAction(): Promise<CompanyRegistrySnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return loadCompanyRegistrySnapshotForUser(supabase, user.id);
}
