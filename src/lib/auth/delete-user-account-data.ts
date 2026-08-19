import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { deleteObjects } from '../storage/r2/operations';
import {
  collectStoragePathsFromUnknown,
  groupStoragePathsByBucket,
  type StoragePathsByBucket,
} from './delete-user-account-storage-paths';

type AdminClient = SupabaseClient<Database>;

export type DeleteUserAccountDataResult = { ok: true } | { ok: false; error: string };

async function collectStoragePathsByBucket(
  admin: AdminClient,
  userId: string,
): Promise<{ ok: true; pathsByBucket: StoragePathsByBucket } | { ok: false; error: string }> {
  const collected = new Set<string>();

  const { data: profileRow, error: profileError } = await admin
    .from('user_profiles')
    .select('verification_document_paths')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  collectStoragePathsFromUnknown(profileRow?.verification_document_paths ?? null, userId, collected);

  const { data: settingsRow, error: settingsError } = await admin
    .from('contractor_account_settings')
    .select(
      'oc_policy_scan_path, professional_qualifications_scan_path, zus_certificate_path, tax_certificate_path, reference_document_paths',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (settingsError) {
    return { ok: false, error: settingsError.message };
  }

  const directSettingsPaths = [
    settingsRow?.oc_policy_scan_path,
    settingsRow?.professional_qualifications_scan_path,
    settingsRow?.zus_certificate_path,
    settingsRow?.tax_certificate_path,
  ];
  for (const rawPath of directSettingsPaths) {
    if (typeof rawPath === 'string' && rawPath.trim()) {
      collected.add(rawPath.trim());
    }
  }
  collectStoragePathsFromUnknown(settingsRow?.reference_document_paths ?? null, userId, collected);

  const { data: fileUploads, error: fileUploadsError } = await admin
    .from('file_uploads')
    .select('file_path')
    .eq('user_id', userId);

  if (fileUploadsError) {
    return { ok: false, error: fileUploadsError.message };
  }

  for (const row of fileUploads ?? []) {
    if (typeof row.file_path === 'string' && row.file_path.trim()) {
      collected.add(row.file_path.trim());
    }
  }

  const { data: jobsRows, error: jobsError } = await admin
    .from('jobs')
    .select('images')
    .eq('manager_id', userId);

  if (jobsError) {
    return { ok: false, error: jobsError.message };
  }

  for (const row of jobsRows ?? []) {
    collectStoragePathsFromUnknown(row.images, userId, collected);
  }

  const { data: managerContestRows, error: managerContestsError } = await admin
    .from('contests')
    .select('documents')
    .eq('manager_id', userId);

  if (managerContestsError) {
    return { ok: false, error: managerContestsError.message };
  }

  for (const row of managerContestRows ?? []) {
    collectStoragePathsFromUnknown(row.documents, userId, collected);
  }

  const { data: offerRows, error: offersError } = await admin
    .from('contest_offers')
    .select('attachments, offer_details')
    .eq('contractor_id', userId);

  if (offersError) {
    return { ok: false, error: offersError.message };
  }

  for (const row of offerRows ?? []) {
    collectStoragePathsFromUnknown(row.attachments, userId, collected);
    collectStoragePathsFromUnknown(row.offer_details, userId, collected);
  }

  const { data: applicationRows, error: applicationsError } = await admin
    .from('job_applications')
    .select('attachments')
    .eq('contractor_id', userId);

  if (applicationsError) {
    return { ok: false, error: applicationsError.message };
  }

  for (const row of applicationRows ?? []) {
    collectStoragePathsFromUnknown(row.attachments, userId, collected);
  }

  const { data: messageRows, error: messagesError } = await admin
    .from('messages')
    .select('attachments')
    .eq('sender_id', userId);

  if (messagesError) {
    return { ok: false, error: messagesError.message };
  }

  for (const row of messageRows ?? []) {
    collectStoragePathsFromUnknown(row.attachments, userId, collected);
  }

  const { data: tenderDocumentRows, error: tenderDocumentsError } = await admin
    .from('tender_documents')
    .select('file_url')
    .eq('uploaded_by', userId);

  if (tenderDocumentsError) {
    return { ok: false, error: tenderDocumentsError.message };
  }

  for (const row of tenderDocumentRows ?? []) {
    if (typeof row.file_url === 'string' && row.file_url.trim()) {
      collected.add(row.file_url.trim());
    }
  }

  return { ok: true, pathsByBucket: groupStoragePathsByBucket(collected) };
}

async function deleteStorageObjectsByBucket(
  pathsByBucket: StoragePathsByBucket,
): Promise<DeleteUserAccountDataResult> {
  for (const [bucket, paths] of pathsByBucket.entries()) {
    if (paths.size === 0) continue;
    try {
      await deleteObjects(bucket, [...paths]);
    } catch (error) {
      return {
        ok: false,
        error: `Nie udało się usunąć plików z magazynu (${bucket}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
  return { ok: true };
}

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

  // NO ACTION FKs: null before profile delete (CASCADE on participants alone is not enough).
  const { error: conversationSenderError } = await admin
    .from('conversations')
    .update({ last_message_sender_id: null })
    .eq('last_message_sender_id', userId);

  if (conversationSenderError) {
    return { ok: false, error: conversationSenderError.message };
  }

  const { error: tenderDocumentsError } = await admin
    .from('tender_documents')
    .update({ uploaded_by: null })
    .eq('uploaded_by', userId);

  if (tenderDocumentsError) {
    return { ok: false, error: tenderDocumentsError.message };
  }

  return { ok: true };
}

/**
 * Removes company/NIP data linked to a user before auth deletion.
 * Orphan companies are fully deleted; if that is not possible we abort
 * account deletion instead of leaving partially anonymized company data.
 */
export async function deleteUserAccountData(
  admin: AdminClient,
  userId: string,
): Promise<DeleteUserAccountDataResult> {
  const storagePaths = await collectStoragePathsByBucket(admin, userId);
  if (!storagePaths.ok) {
    return storagePaths;
  }

  const storageCleanup = await deleteStorageObjectsByBucket(storagePaths.pathsByBucket);
  if (!storageCleanup.ok) {
    return storageCleanup;
  }

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

  const { error: ordersError } = await admin
    .from('orders')
    .delete()
    .or(`manager_company_id.eq.${companyId},contractor_company_id.eq.${companyId}`);

  if (ordersError) {
    return { ok: false, error: ordersError.message };
  }

  const { error: contestOffersError } = await admin
    .from('contest_offers')
    .delete()
    .eq('company_id', companyId);

  if (contestOffersError) {
    return { ok: false, error: contestOffersError.message };
  }

  const { error: jobApplicationsError } = await admin
    .from('job_applications')
    .delete()
    .eq('company_id', companyId);

  if (jobApplicationsError) {
    return { ok: false, error: jobApplicationsError.message };
  }

  const { error: contestsError } = await admin
    .from('contests')
    .delete()
    .eq('company_id', companyId);

  if (contestsError) {
    return { ok: false, error: contestsError.message };
  }

  const { error: jobsError } = await admin.from('jobs').delete().eq('company_id', companyId);

  if (jobsError) {
    return { ok: false, error: jobsError.message };
  }

  const { error: deleteCompanyError } = await admin
    .from('companies')
    .delete()
    .eq('id', companyId);

  if (deleteCompanyError) {
    return {
      ok: false,
      error: `Nie udało się usunąć osieroconej firmy (${companyId}): ${deleteCompanyError.message}`,
    };
  }

  return { ok: true };
}
