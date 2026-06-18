'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../../lib/supabase/server';
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

export async function submitVerificationDocumentsAction(
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
      ? ['company_registration', 'insurance', 'certifications', 'references']
      : ['company_registration', 'insurance', 'management_license', 'management_contracts'];

  const optionalDocKeys =
    userType === 'contractor'
      ? new Set(['certifications', 'references'])
      : new Set(['management_license', 'management_contracts']);

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
  const onlyOptionalUploads =
    profile.is_verified &&
    newPathKeys.length > 0 &&
    newPathKeys.every((key) => optionalDocKeys.has(key));

  if (profile.is_verified && !onlyOptionalUploads && newPathKeys.length > 0) {
    const { invalidateUserVerification } = await import('../../lib/verification/invalidate-verification');
    await invalidateUserVerification(supabase, user.id);
  }

  let hasInsuranceDoc = Boolean(merged.insurance);
  if (userType === 'contractor' && !hasInsuranceDoc) {
    const ocPath = await fetchOcPolicyScanPathServer(supabase, user.id);
    if (ocPath) {
      // Pull the OC scan from account settings into the verification doc set
      // so admins see one unified list and the rest of the flow uses one
      // canonical path.
      merged.insurance = ocPath;
      hasInsuranceDoc = true;
    }
  }

  const hasCompanyReg = Boolean(merged.company_registration);

  if (!hasCompanyReg && userType === 'contractor') {
    // user_companies is not in generated Database types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: companyRelation } = await (supabase as any)
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();

    if (companyRelation?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('krs, regon')
        .eq('id', companyRelation.company_id)
        .maybeSingle();

      const hasKrsOrRegon = Boolean(
        (company?.krs && String(company.krs).trim()) ||
          (company?.regon && String(company.regon).trim()),
      );
      if (hasKrsOrRegon) {
        // KRS/REGON w profilu zastępują wymóg wypisu KRS/CEIDG (OPD-56)
      } else {
        return { ok: false, error: 'Wymagany dokument: wypis z KRS / CEIDG lub uzupełnienie KRS/REGON w danych firmy.' };
      }
    } else {
      return { ok: false, error: 'Wymagany dokument: wypis z KRS / CEIDG lub uzupełnienie KRS/REGON w danych firmy.' };
    }
  } else if (!hasCompanyReg) {
    return { ok: false, error: 'Wymagany dokument: wypis z KRS / CEIDG.' };
  }
  if (!hasInsuranceDoc) {
    return {
      ok: false,
      error:
        userType === 'contractor'
          ? 'Wymagana polisa OC: prześlij plik lub uzupełnij skan OC w ustawieniach konta wykonawcy.'
          : 'Wymagany dokument ubezpieczenia OC.',
    };
  }

  if (userType === 'contractor' && !onlyOptionalUploads) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contractorSettings, error: settingsError } = await (supabase as any)
      .from('contractor_account_settings')
      .select('oc_valid_until, oc_guarantee_amount')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError) {
      return { ok: false, error: 'Nie udało się wczytać danych polisy OC.' };
    }

    const ocValidUntil =
      typeof contractorSettings?.oc_valid_until === 'string'
        ? contractorSettings.oc_valid_until.trim()
        : '';
    const guaranteeRaw = contractorSettings?.oc_guarantee_amount;
    const guaranteeAmount =
      typeof guaranteeRaw === 'number'
        ? guaranteeRaw
        : guaranteeRaw != null
          ? Number(guaranteeRaw)
          : NaN;

    if (!ocValidUntil) {
      return {
        ok: false,
        error: 'Uzupełnij datę ważności polisy OC przed wysłaniem dokumentów.',
      };
    }
    if (!Number.isFinite(guaranteeAmount) || guaranteeAmount <= 0) {
      return {
        ok: false,
        error: 'Uzupełnij sumę gwarancyjną polisy OC przed wysłaniem dokumentów.',
      };
    }
  }

  const profileUpdate: { verification_document_paths: Json; verification_submitted_at?: string } = {
    verification_document_paths: merged as Json,
  };
  if (!onlyOptionalUploads) {
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

export async function removeAccountVerificationDocumentAction(
  payload:
    | { kind: 'verification'; documentKey: string }
    | { kind: 'zus_certificate' }
    | { kind: 'tax_certificate' }
    | { kind: 'professional_qualifications_scan' }
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
