import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../types/database';
import { deleteVerificationDocument } from '../storage/verification-documents';
import { parseProfessionalQualificationDocuments } from '../contractor/professional-qualification-documents';
import { resetVerificationAfterDocumentRemoval } from './reset-after-document-removal';

const VERIFICATION_DOC_KEYS = new Set([
  'company_registration',
  'insurance',
  'certifications',
  'references',
  'management_license',
  'management_contracts',
]);

export type RemoveAccountDocumentPayload =
  | { kind: 'verification'; documentKey: string }
  | { kind: 'zus_certificate' }
  | { kind: 'tax_certificate' }
  | { kind: 'professional_qualifications_scan' }
  | { kind: 'professional_qualification_document'; typeId: string };

export interface RemoveAccountDocumentResult {
  ok: boolean;
  error?: string;
  verificationReset?: boolean;
}

async function removeStoragePath(path: string | null | undefined): Promise<void> {
  if (!path?.trim()) return;
  const { error } = await deleteVerificationDocument(path.trim());
  if (error) {
    console.error('removeStoragePath:', error);
  }
}

export async function removeAccountDocumentForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: RemoveAccountDocumentPayload
): Promise<RemoveAccountDocumentResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  if (payload.kind === 'verification') {
    const { documentKey } = payload;
    if (!VERIFICATION_DOC_KEYS.has(documentKey)) {
      return { ok: false, error: 'Nieprawidłowy typ dokumentu.' };
    }

    const [{ data: profile }, { data: settings }] = await Promise.all([
      sb
        .from('user_profiles')
        .select('verification_document_paths, user_type')
        .eq('id', userId)
        .maybeSingle(),
      sb
        .from('contractor_account_settings')
        .select('oc_policy_scan_path')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    const paths =
      (profile?.verification_document_paths as Record<string, string> | null | undefined) ?? {};
    const storedPath = paths[documentKey] ?? null;
    const ocPath =
      documentKey === 'insurance'
        ? ((settings?.oc_policy_scan_path as string | null) ?? null)
        : null;

    const pathToDelete =
      storedPath && ocPath && storedPath !== ocPath
        ? [storedPath, ocPath]
        : [storedPath ?? ocPath].filter(Boolean);

    if (pathToDelete.length === 0) {
      return { ok: false, error: 'Brak zapisanego pliku do usunięcia.' };
    }

    for (const p of pathToDelete) {
      await removeStoragePath(p);
    }

    const nextPaths = { ...paths };
    delete nextPaths[documentKey];

    const profilePatch: Record<string, unknown> = {
      verification_document_paths: nextPaths as Json,
    };

    await sb.from('user_profiles').update(profilePatch).eq('id', userId);

    if (documentKey === 'insurance') {
      await sb
        .from('contractor_account_settings')
        .update({
          oc_policy_scan_path: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    const skipAccountReset =
      documentKey === 'insurance' && profile?.user_type === 'contractor';
    const reset = await resetVerificationAfterDocumentRemoval(
      supabase,
      userId,
      documentKey,
      { resetAccountVerification: !skipAccountReset },
    );

    return {
      ok: true,
      verificationReset:
        reset.hadApprovedVerification || reset.clearedPendingSubmission,
    };
  }

  if (payload.kind === 'zus_certificate' || payload.kind === 'tax_certificate') {
    const isZus = payload.kind === 'zus_certificate';
    const { data: settings } = await sb
      .from('contractor_account_settings')
      .select('zus_certificate_path, tax_certificate_path')
      .eq('user_id', userId)
      .maybeSingle();

    const path = isZus
      ? ((settings?.zus_certificate_path as string | null) ?? null)
      : ((settings?.tax_certificate_path as string | null) ?? null);

    if (!path) {
      return { ok: false, error: 'Brak zapisanego pliku do usunięcia.' };
    }

    await removeStoragePath(path);

    await sb
      .from('contractor_account_settings')
      .update({
        ...(isZus
          ? { zus_certificate_path: null, zus_certificate_issued_at: null }
          : { tax_certificate_path: null, tax_certificate_issued_at: null }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    const reset = await resetVerificationAfterDocumentRemoval(supabase, userId);
    return {
      ok: true,
      verificationReset:
        reset.hadApprovedVerification || reset.clearedPendingSubmission,
    };
  }

  if (payload.kind === 'professional_qualification_document') {
    const { typeId } = payload;
    const { data: settings } = await sb
      .from('contractor_account_settings')
      .select('professional_qualification_documents')
      .eq('user_id', userId)
      .maybeSingle();

    const documents = parseProfessionalQualificationDocuments(
      settings?.professional_qualification_documents,
    );
    const current = documents[typeId];
    if (!current?.path) {
      return { ok: false, error: 'Brak zapisanego pliku do usunięcia.' };
    }

    await removeStoragePath(current.path);
    const nextDocuments = { ...documents };
    delete nextDocuments[typeId];

    await sb
      .from('contractor_account_settings')
      .update({
        professional_qualification_documents: nextDocuments,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    const reset = await resetVerificationAfterDocumentRemoval(supabase, userId);
    return {
      ok: true,
      verificationReset:
        reset.hadApprovedVerification || reset.clearedPendingSubmission,
    };
  }

  const { data: settings } = await sb
    .from('contractor_account_settings')
    .select('professional_qualifications_scan_path')
    .eq('user_id', userId)
    .maybeSingle();

  const path =
    (settings?.professional_qualifications_scan_path as string | null) ?? null;

  if (!path) {
    return { ok: false, error: 'Brak zapisanego pliku do usunięcia.' };
  }

  await removeStoragePath(path);

  await sb
    .from('contractor_account_settings')
    .update({
      professional_qualifications_scan_path: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  const reset = await resetVerificationAfterDocumentRemoval(supabase, userId);
  return {
    ok: true,
    verificationReset:
      reset.hadApprovedVerification || reset.clearedPendingSubmission,
  };
}
