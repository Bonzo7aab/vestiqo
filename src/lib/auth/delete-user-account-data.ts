import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';

type AdminClient = SupabaseClient<Database>;

export type DeleteUserAccountDataResult = { ok: true } | { ok: false; error: string };

/**
 * Removes rows that reference user_profiles without ON DELETE CASCADE.
 * Order matters because orders restrict deletion of contest offers.
 */
async function deleteUserProfileDependencies(
  admin: AdminClient,
  userId: string,
): Promise<DeleteUserAccountDataResult> {
  const { error: ordersError } = await admin
    .from('orders')
    .delete()
    .or(`manager_id.eq.${userId},contractor_id.eq.${userId}`);

  if (ordersError) {
    return { ok: false, error: ordersError.message };
  }

  const { error: contestOffersError } = await admin
    .from('contest_offers')
    .delete()
    .eq('contractor_id', userId);

  if (contestOffersError) {
    return { ok: false, error: contestOffersError.message };
  }

  const { error: jobApplicationsError } = await admin
    .from('job_applications')
    .delete()
    .eq('contractor_id', userId);

  if (jobApplicationsError) {
    return { ok: false, error: jobApplicationsError.message };
  }

  const { error: contestsError } = await admin
    .from('contests')
    .delete()
    .eq('manager_id', userId);

  if (contestsError) {
    return { ok: false, error: contestsError.message };
  }

  const { error: jobsError } = await admin.from('jobs').delete().eq('manager_id', userId);

  if (jobsError) {
    return { ok: false, error: jobsError.message };
  }

  const { error: certificatesError } = await admin
    .from('certificates')
    .update({ verified_by: null })
    .eq('verified_by', userId);

  if (certificatesError) {
    return { ok: false, error: certificatesError.message };
  }

  const { error: questionsError } = await admin
    .from('questions')
    .update({ answered_by: null })
    .eq('answered_by', userId);

  if (questionsError) {
    return { ok: false, error: questionsError.message };
  }

  return { ok: true };
}

/**
 * Removes company/NIP data linked to a user before auth deletion.
 * Orphan companies are deleted when possible; otherwise NIP/REGON are cleared
 * so the tax id can be registered again.
 */
export async function deleteUserAccountData(
  admin: AdminClient,
  userId: string,
): Promise<DeleteUserAccountDataResult> {
  const dependencyCleanup = await deleteUserProfileDependencies(admin, userId);
  if (!dependencyCleanup.ok) {
    return dependencyCleanup;
  }

  const { data: companyLinks, error: linksError } = await admin
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId);

  if (linksError) {
    return { ok: false, error: linksError.message };
  }

  const companyIds = [
    ...new Set((companyLinks ?? []).map(link => link.company_id).filter(Boolean)),
  ];

  const { error: unlinkError } = await admin
    .from('user_companies')
    .delete()
    .eq('user_id', userId);

  if (unlinkError) {
    return { ok: false, error: unlinkError.message };
  }

  for (const companyId of companyIds) {
    const cleanupResult = await cleanupOrphanCompany(admin, companyId);
    if (!cleanupResult.ok) {
      return cleanupResult;
    }
  }

  const { error: contractorSettingsError } = await admin
    .from('contractor_account_settings')
    .delete()
    .eq('user_id', userId);

  if (contractorSettingsError) {
    return { ok: false, error: contractorSettingsError.message };
  }

  const { error: profileDeleteError } = await admin
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (profileDeleteError) {
    return { ok: false, error: profileDeleteError.message };
  }

  return { ok: true };
}

async function cleanupOrphanCompany(
  admin: AdminClient,
  companyId: string,
): Promise<DeleteUserAccountDataResult> {
  const { count, error: countError } = await admin
    .from('user_companies')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (countError) {
    return { ok: false, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return { ok: true };
  }

  const { error: deleteCompanyError } = await admin
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (!deleteCompanyError) {
    return { ok: true };
  }

  const { error: clearIdentifiersError } = await admin
    .from('companies')
    .update({ nip: null, regon: null })
    .eq('id', companyId);

  if (clearIdentifiersError) {
    return {
      ok: false,
      error: `Nie udało się usunąć firmy ani zwolnić NIP: ${clearIdentifiersError.message}`,
    };
  }

  return { ok: true };
}
