'use server';

import { instrumentServerAction } from '../sentry/instrument-server-action';
import { createAdminClientOrNull } from '../supabase/admin';
import { isValidNip, normalizeNip } from '../gus/nip';
import { lookupByNip } from '../gus/lookup-by-nip';
import {
  isValidPolishPhone,
  normalizePolishPhone,
  POLISH_PHONE_INVALID_MESSAGE,
} from '../phone/polish-phone';
import { checkEmailRegistrationStatus } from '../auth/registration-checks';
import { uploadObject } from '../storage/r2/operations';
import { STORAGE_BUCKETS } from '../storage/buckets';
import type { Json } from '../../types/database';
import {
  COMMUNITY_CLAIM_HOLDING_COPY,
  COMMUNITY_CLAIM_INELIGIBLE_MESSAGE,
  COMMUNITY_CLAIM_MAX_PDF_BYTES,
  communityClaimResolutionPath,
  describeCommunityClaimEligibility,
} from './constants';
import { resolveCommunityClaimEligibility } from './eligibility';

export type SubmitCommunityAccountClaimResult =
  | { ok: true; message: string }
  | { error: string };

const GENERIC_SUBMIT_ERROR =
  'Nie udało się złożyć wniosku. Spróbuj ponownie za chwilę.';

function isPdfFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
}

async function submitCommunityAccountClaimActionImpl(formData: FormData): Promise<SubmitCommunityAccountClaimResult> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    return { error: GENERIC_SUBMIT_ERROR };
  }

  const nip = normalizeNip(String(formData.get('nip') ?? ''));
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const phone = String(formData.get('phone') ?? '').trim();
  const resolution = formData.get('resolution');

  if (!isValidNip(nip)) {
    return { error: COMMUNITY_CLAIM_INELIGIBLE_MESSAGE };
  }
  if (!firstName || !lastName) {
    return { error: 'Podaj imię i nazwisko osoby kontaktowej.' };
  }
  if (!email || !email.includes('@')) {
    return { error: 'Podaj prawidłowy adres email.' };
  }
  if (!isValidPolishPhone(phone)) {
    return { error: POLISH_PHONE_INVALID_MESSAGE };
  }
  if (!(resolution instanceof File) || resolution.size === 0) {
    return { error: 'Dołącz PDF uchwały z podpisem cyfrowym.' };
  }
  if (!isPdfFile(resolution)) {
    return { error: 'Uchwała musi być plikiem PDF (maks. 10 MB).' };
  }
  if (resolution.size > COMMUNITY_CLAIM_MAX_PDF_BYTES) {
    return { error: 'Plik jest zbyt duży. Maksymalny rozmiar: 10 MB.' };
  }

  const emailStatus = await checkEmailRegistrationStatus(admin, email);
  if (emailStatus === 'taken') {
    return {
      error: 'Ten adres email jest już zarejestrowany. Zaloguj się lub użyj resetu hasła.',
    };
  }
  if (emailStatus === 'unavailable') {
    return { error: GENERIC_SUBMIT_ERROR };
  }

  let eligibility;
  try {
    eligibility = await resolveCommunityClaimEligibility(admin, nip);
  } catch (error) {
    console.error('submitCommunityAccountClaim eligibility failed:', error);
    return { error: GENERIC_SUBMIT_ERROR };
  }

  const described = describeCommunityClaimEligibility(eligibility.reason);
  if (!described.eligible || !eligibility.entity) {
    return { error: described.message ?? COMMUNITY_CLAIM_INELIGIBLE_MESSAGE };
  }

  const entity = eligibility.entity;
  let gusSnapshot: Json | null = null;
  try {
    const gus = await lookupByNip(nip);
    if (gus) {
      gusSnapshot = { ...gus } as Json;
    }
  } catch (error) {
    console.warn('submitCommunityAccountClaim GUS lookup failed:', error);
  }

  const { data: inserted, error: insertError } = await admin
    .from('community_account_claims')
    .insert({
      managed_entity_id: entity.id,
      nip,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: normalizePolishPhone(phone),
      resolution_path: '',
      status: 'pending',
      gus_snapshot: gusSnapshot,
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    if (insertError?.message?.toLowerCase().includes('idx_community_account_claims_one_pending')) {
      return { error: described.message ?? COMMUNITY_CLAIM_INELIGIBLE_MESSAGE };
    }
    console.error('submitCommunityAccountClaim insert failed:', insertError?.message);
    return { error: GENERIC_SUBMIT_ERROR };
  }

  const claimId = inserted.id;
  const objectPath = communityClaimResolutionPath(claimId);

  try {
    const pdf = new File([resolution], 'uchwala.pdf', {
      type: 'application/pdf',
    });
    await uploadObject(STORAGE_BUCKETS.VERIFICATION_DOCUMENTS, objectPath, pdf);
  } catch (error) {
    console.error('submitCommunityAccountClaim upload failed:', error);
    await admin.from('community_account_claims').delete().eq('id', claimId);
    return { error: 'Nie udało się zapisać uchwały. Spróbuj ponownie.' };
  }

  const { error: pathError } = await admin
    .from('community_account_claims')
    .update({ resolution_path: objectPath })
    .eq('id', claimId);

  if (pathError) {
    console.error('submitCommunityAccountClaim path update failed:', pathError.message);
  }

  return { ok: true, message: COMMUNITY_CLAIM_HOLDING_COPY };
}

export const submitCommunityAccountClaimAction = instrumentServerAction(
  'submitCommunityAccountClaimAction',
  submitCommunityAccountClaimActionImpl,
);
