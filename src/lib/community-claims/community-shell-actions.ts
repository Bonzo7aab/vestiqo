'use server';

import { instrumentServerAction } from '../sentry/instrument-server-action';
import { createClient } from '../supabase/server';
import { createAdminClientOrNull } from '../supabase/admin';
import {
  deleteUnclaimedCommunityShellIfOrphan,
  syncUnclaimedCommunityShell,
} from './community-shell';

async function callerOwnsManagerCompany(managerCompanyId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { data: membership, error } = await supabase
    .from('user_companies')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_id', managerCompanyId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Community shell membership check failed:', error.message);
    return false;
  }

  return Boolean(membership);
}

async function syncCommunityShellAfterEntityUpdateImpl(input: {
  managerCompanyId: string;
  entityId: string;
  previousNip: string;
}): Promise<void> {
  const ownsCompany = await callerOwnsManagerCompany(input.managerCompanyId);
  if (!ownsCompany) {
    return;
  }

  const supabase = await createClient();
  const { data: entity, error } = await supabase
    .from('managed_housing_entities')
    .select('id, nip, name, regon, address, city, postal_code, manager_company_id')
    .eq('id', input.entityId)
    .eq('manager_company_id', input.managerCompanyId)
    .maybeSingle();

  if (error || !entity) {
    if (error) {
      console.error('Community shell entity lookup failed:', error.message);
    }
    return;
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    console.error('Community shell sync skipped: admin client unavailable');
    return;
  }

  const synced = await syncUnclaimedCommunityShell(admin, input.previousNip, {
    nip: entity.nip,
    name: entity.name,
    regon: entity.regon,
    address: entity.address,
    city: entity.city,
    postal_code: entity.postal_code,
  });
  if ('error' in synced) {
    console.error('Community shell sync failed:', synced.error);
  }
}

async function deleteCommunityShellAfterEntityRemovedImpl(input: {
  managerCompanyId: string;
  nip: string;
}): Promise<void> {
  const ownsCompany = await callerOwnsManagerCompany(input.managerCompanyId);
  if (!ownsCompany) {
    return;
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    console.error('Community shell delete skipped: admin client unavailable');
    return;
  }

  const deleted = await deleteUnclaimedCommunityShellIfOrphan(admin, input.nip);
  if ('error' in deleted) {
    console.error('Community shell delete failed:', deleted.error);
  }
}

export const syncCommunityShellAfterEntityUpdate = instrumentServerAction(
  'syncCommunityShellAfterEntityUpdate',
  syncCommunityShellAfterEntityUpdateImpl,
);

export const deleteCommunityShellAfterEntityRemoved = instrumentServerAction(
  'deleteCommunityShellAfterEntityRemoved',
  deleteCommunityShellAfterEntityRemovedImpl,
);
