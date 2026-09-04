'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../../lib/supabase/server';
import { instrumentServerAction } from '../../lib/sentry/instrument-server-action';
import { getRequiredDocumentKeys } from '../../lib/verification/required-documents';
import type { Database, Json } from '../../types/database';

const DEFAULT_CONTRACTOR_NOTIFICATION_CHANNELS = {
  email: true,
  app: true,
  phoneCall: false,
  sms: false,
};

const DEFAULT_CONTRACTOR_RADAR = {
  enabled: true,
  minAmountNet: 1000,
  areas: ['Warszawa'],
};

/**
 * Mirror an `insurance` upload from /weryfikacja into the contractor's OC
 * settings, so the /konto "Ubezpieczenie OC" card and the verification page
 * see the same file. Best-effort: a sync failure must not abort the main
 * verification submission, but it is logged.
 */
async function syncInsuranceToContractorSettings(
  supabase: SupabaseClient<Database>,
  userId: string,
  insurancePath: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  try {
    const { data: existing, error: readErr } = await sb
      .from('contractor_account_settings')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (readErr) {
      console.error('syncInsuranceToContractorSettings: read failed', readErr);
      return;
    }

    if (existing) {
      const { error: updateErr } = await sb
        .from('contractor_account_settings')
        .update({
          oc_policy_scan_path: insurancePath,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      if (updateErr) {
        console.error('syncInsuranceToContractorSettings: update failed', updateErr);
      }
      return;
    }

    const { error: insertErr } = await sb
      .from('contractor_account_settings')
      .insert({
        user_id: userId,
        oc_policy_scan_path: insurancePath,
        notification_channels: DEFAULT_CONTRACTOR_NOTIFICATION_CHANNELS,
        radar_settings: DEFAULT_CONTRACTOR_RADAR,
      });
    if (insertErr) {
      console.error('syncInsuranceToContractorSettings: insert failed', insertErr);
    }
  } catch (err) {
    console.error('syncInsuranceToContractorSettings: unexpected error', err);
  }
}

/**
 * Server-side replacement for the browser-only
 * `getContractorAccountSettings.ocPolicyScanPath`. Used while validating
 * whether the contractor has provided OC through either flow.
 */
async function fetchOcPolicyScanPathServer(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('contractor_account_settings')
    .select('oc_policy_scan_path')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('fetchOcPolicyScanPathServer:', error);
    return null;
  }
  return (data?.oc_policy_scan_path as string | null) ?? null;
}

async function submitVerificationDocumentsActionImpl(
  uploadedPaths: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Musisz być zalogowany.' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_type, verification_document_paths, is_verified')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: 'Nie udało się wczytać profilu.' };
  }

  const userType = profile.user_type;
  const docKeys =
    userType === 'contractor'
      ? ['insurance', 'certifications', 'references']
      : ['company_registration', 'insurance', 'management_license', 'management_contracts'];

  const requiredKeys = new Set(getRequiredDocumentKeys(userType ?? ''));

  const existingPaths =
    (profile.verification_document_paths as Record<string, string> | null | undefined) ?? {};

  const newPaths: Record<string, string> = {};

  for (const key of docKeys) {
    const path = uploadedPaths[key]?.trim();
    if (!path) continue;
    if (!path.startsWith(`${user.id}/weryfikacja/${key}/`)) {
      return { ok: false, error: 'Nieprawidłowa ścieżka przesłanego dokumentu.' };
    }
    newPaths[key] = path;
  }

  const merged = { ...existingPaths, ...newPaths };
  const newPathKeys = Object.keys(newPaths);
  const newRequiredKeys = newPathKeys.filter((key) => requiredKeys.has(key));
  const onlyOptionalUploads =
    newPathKeys.length > 0 && newRequiredKeys.length === 0;

  if (profile.is_verified && newRequiredKeys.length > 0) {
    const { invalidateUserVerification } = await import('../../lib/verification/invalidate-verification');
    await invalidateUserVerification(supabase, user.id);
  }

  let hasInsuranceDoc = Boolean(merged.insurance);
  if (userType !== 'contractor' && !hasInsuranceDoc) {
    const ocPath = await fetchOcPolicyScanPathServer(supabase, user.id);
    if (ocPath) {
      merged.insurance = ocPath;
      hasInsuranceDoc = true;
    }
  }

  const hasCompanyReg = Boolean(merged.company_registration);

  if (!hasCompanyReg && userType !== 'contractor') {
    return { ok: false, error: 'Wymagany dokument: wypis z KRS / CEIDG.' };
  }
  if (userType !== 'contractor' && !hasInsuranceDoc) {
    return {
      ok: false,
      error: 'Wymagany dokument ubezpieczenia OC.',
    };
  }

  const profileUpdate: { verification_document_paths: Json; verification_submitted_at?: string } = {
    verification_document_paths: merged as Json,
  };
  if (userType !== 'contractor' && !onlyOptionalUploads) {
    profileUpdate.verification_submitted_at = new Date().toISOString();
  }

  const { error: updateErr } = await supabase
    .from('user_profiles')
    .update(profileUpdate)
    .eq('id', user.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  // Mirror any newly uploaded insurance file into the contractor's OC
  // settings so /konto?tab=twoje-dane reflects the same state.
  if (userType === 'contractor' && newPaths.insurance) {
    await syncInsuranceToContractorSettings(supabase, user.id, newPaths.insurance);
  }

  revalidatePath('/konto');
  return { ok: true };
}

async function removeAccountVerificationDocumentActionImpl(
  payload:
    | { kind: 'verification'; documentKey: string }
    | { kind: 'zus_certificate' }
    | { kind: 'tax_certificate' }
    | { kind: 'professional_qualifications_scan' }
    | { kind: 'professional_qualification_document'; typeId: string }
): Promise<{ ok: boolean; error?: string; verificationReset?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: 'Musisz być zalogowany.' };
  }

  const { removeAccountDocumentForUser } = await import(
    '../../lib/verification/remove-account-document'
  );

  const result = await removeAccountDocumentForUser(supabase, user.id, payload);

  if (result.ok) {
    revalidatePath('/konto');
    revalidatePath('/weryfikacja');
  }

  return result;
}

export const submitVerificationDocumentsAction = instrumentServerAction(
  'submitVerificationDocumentsAction',
  submitVerificationDocumentsActionImpl,
);
export const removeAccountVerificationDocumentAction = instrumentServerAction(
  'removeAccountVerificationDocumentAction',
  removeAccountVerificationDocumentActionImpl,
);
