import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ContestInfo } from '../../types/job';
import type {
  ContestOfferDetails,
  ContestOfferFormData,
  FormalRequirementKey,
} from '../../types/contest-offer';
import {
  computeGrossFromNet,
  formDataToOfferDetails,
  mergeAttachmentsForBid,
  offerDetailsToFormData,
} from '../../types/contest-offer';
import type { SiteVisitType } from '../../types/tender-contest';
import { uploadContestOfferStagedFiles } from '../contest-offer/upload-staged-offer-files';
import {
  CONTEST_OFFER_ERRORS,
  contestOfferErrorFromUnknown,
  isContestOfferUniqueConflict,
} from '../contest-offer/error-messages';
import { loadContractorFormalProfileSnapshot } from '../contest-offer/load-formal-profile-snapshot';
import { validateContestOfferSubmit } from '../contest-offer/offer-form-validation';

export type TenderBidOfferState = 'none' | 'draft' | 'submitted';

export interface TenderBidRowLite {
  id: string;
  status: string;
  offer_details?: ContestOfferDetails | null;
  bid_amount?: number;
  experience_summary?: string | null;
  attachments?: unknown;
  proposed_start_date?: string | null;
  proposed_timeline?: number | null;
}

async function ensureContractorCanBid(
  supabase: SupabaseClient<Database>,
  contractorId: string,
): Promise<{ companyId: string } | { error: PostgrestError }> {
  const { canUserUsePlatformFeatures } = await import('../verification/can-use-platform');
  const access = await canUserUsePlatformFeatures(supabase, contractorId);
  if (!access.allowed) {
    return {
      error: new Error(
        access.message ?? 'Konto wykonawcy nie jest zweryfikowane.',
      ) as PostgrestError,
    };
  }

  const { fetchUserPrimaryCompany } = await import('./companies');
  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    contractorId,
  );

  if (companyError || !company) {
    return {
      error: new Error(
        companyError
          ? contestOfferErrorFromUnknown(companyError)
          : CONTEST_OFFER_ERRORS.missingCompany,
      ) as PostgrestError,
    };
  }

  return { companyId: company.id };
}

function daysUntilCompletion(completionDateIso: string): number | null {
  const completion = new Date(completionDateIso);
  if (Number.isNaN(completion.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  completion.setHours(0, 0, 0, 0);
  const diff = completion.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function uploadStagedFiles(
  userId: string,
  tenderId: string,
  form: ContestOfferFormData,
): Promise<{ form: ContestOfferFormData; error: string | null }> {
  return uploadContestOfferStagedFiles(userId, tenderId, form);
}

function buildRowFromForm(
  form: ContestOfferFormData,
  step?: number,
  status: 'draft' | 'submitted' = 'draft',
): Record<string, unknown> {
  const details = formDataToOfferDetails(form, step);
  const net = details.netPrice ?? 0;
  const attachments = mergeAttachmentsForBid(form);
  const timeline = form.proposedCompletionDate
    ? daysUntilCompletion(form.proposedCompletionDate)
    : null;

  return {
    bid_amount: net > 0 ? net : 0,
    currency: 'PLN',
    proposed_start_date: form.proposedCompletionDate || null,
    proposed_timeline: timeline,
    // Legacy text column; new offers store references as formalAttachments.references (OPD-150).
    experience_summary: form.referencesText.trim() || null,
    attachments: attachments.length > 0 ? attachments : null,
    offer_details: details,
    status,
    ...(status === 'submitted' ? { submitted_at: new Date().toISOString() } : {}),
  };
}

/**
 * Previously remapped `other` → `offerDocumentation` for older drafts.
 * That incorrectly moved Wymogi optional uploads onto step 1 after draft save (OPD-150).
 * Kept as a no-op so call sites remain stable.
 */
export function migrateLegacyOfferAttachments(form: ContestOfferFormData): ContestOfferFormData {
  return form;
}

/** Strip File objects so the form can be passed to server actions. */
export function toSerializableContestOfferForm(form: ContestOfferFormData): ContestOfferFormData {
  return { ...form, stagedFiles: {} };
}

export async function fetchTenderBidOfferState(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  contractorId: string,
): Promise<{ state: TenderBidOfferState; bid: TenderBidRowLite | null }> {
  const access = await ensureContractorCanBid(supabase, contractorId);
  if ('error' in access) {
    return { state: 'none', bid: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('contest_offers')
    .select('id, status, offer_details, bid_amount, experience_summary, attachments, proposed_start_date, proposed_timeline')
    .eq('contest_id', tenderId)
    .eq('company_id', access.companyId)
    .neq('status', 'cancelled');

  const bids = (rows ?? []) as TenderBidRowLite[];
  const submitted = bids.find((b) => b.status !== 'draft');
  if (submitted) {
    return { state: 'submitted', bid: submitted };
  }
  const draft = bids.find((b) => b.status === 'draft');
  if (draft) {
    return { state: 'draft', bid: draft };
  }
  return { state: 'none', bid: null };
}

export async function fetchTenderBidDraft(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  contractorId: string,
): Promise<{ data: TenderBidRowLite | null; error: PostgrestError | null }> {
  const { state, bid } = await fetchTenderBidOfferState(supabase, tenderId, contractorId);
  if (state === 'draft' && bid) {
    return { data: bid, error: null };
  }
  return { data: null, error: null };
}

function userFacingOfferError(error: unknown): PostgrestError {
  return new Error(contestOfferErrorFromUnknown(error)) as PostgrestError;
}

async function insertOfferRow(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  contractorId: string,
  companyId: string,
  row: Record<string, unknown>,
): Promise<{ data: TenderBidRowLite | null; error: PostgrestError | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contest_offers')
    .insert({
      contest_id: tenderId,
      contractor_id: contractorId,
      company_id: companyId,
      ...row,
    })
    .select()
    .single();

  if (!error) {
    return { data: data as TenderBidRowLite, error: null };
  }

  if (!isContestOfferUniqueConflict(error as { code?: string; message?: string })) {
    return { data: null, error: userFacingOfferError(error) };
  }

  const { state, bid } = await fetchTenderBidOfferState(supabase, tenderId, contractorId);
  if (state === 'submitted') {
    return {
      data: null,
      error: new Error(CONTEST_OFFER_ERRORS.alreadySubmitted) as PostgrestError,
    };
  }
  if (state === 'draft' && bid?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase as any)
      .from('contest_offers')
      .update(row)
      .eq('id', bid.id)
      .select()
      .single();
    if (updateError) {
      return { data: null, error: userFacingOfferError(updateError) };
    }
    return { data: updated as TenderBidRowLite, error: null };
  }

  return {
    data: null,
    error: new Error(CONTEST_OFFER_ERRORS.uniqueConflict) as PostgrestError,
  };
}

export async function upsertTenderBidDraft(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  contractorId: string,
  form: ContestOfferFormData,
  currentStep: number,
): Promise<{ data: TenderBidRowLite | null; error: PostgrestError | null }> {
  try {
    const access = await ensureContractorCanBid(supabase, contractorId);
    if ('error' in access) {
      return { data: null, error: access.error };
    }

    const { state } = await fetchTenderBidOfferState(supabase, tenderId, contractorId);
    if (state === 'submitted') {
      return {
        data: null,
        error: new Error(CONTEST_OFFER_ERRORS.alreadySubmitted) as PostgrestError,
      };
    }

    const { form: uploadedForm, error: uploadError } = await uploadStagedFiles(
      contractorId,
      tenderId,
      form,
    );
    if (uploadError) {
      return { data: null, error: new Error(uploadError) as PostgrestError };
    }

    const row = buildRowFromForm(uploadedForm, currentStep, 'draft');

    if (state === 'draft') {
      const { bid } = await fetchTenderBidOfferState(supabase, tenderId, contractorId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contest_offers')
        .update(row)
        .eq('id', bid?.id)
        .select()
        .single();
      if (error) {
        return { data: null, error: userFacingOfferError(error) };
      }
      return { data: data as TenderBidRowLite, error: null };
    }

    return insertOfferRow(supabase, tenderId, contractorId, access.companyId, row);
  } catch (err) {
    return {
      data: null,
      error: userFacingOfferError(err),
    };
  }
}

export async function deleteTenderBidDraft(
  supabase: SupabaseClient<Database>,
  contractorId: string,
  options: { tenderId?: string; bidId?: string },
): Promise<{ success: boolean; error: PostgrestError | null }> {
  try {
    if (!options.tenderId && !options.bidId) {
      return {
        success: false,
        error: new Error('Nieprawidłowe dane szkicu.') as PostgrestError,
      };
    }

    const access = await ensureContractorCanBid(supabase, contractorId);
    if ('error' in access) {
      return { success: false, error: access.error };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('contest_offers')
      .select('id, status, contest_id')
      .eq('contractor_id', contractorId)
      .eq('company_id', access.companyId)
      .eq('status', 'draft');

    if (options.bidId) {
      query = query.eq('id', options.bidId);
    } else if (options.tenderId) {
      query = query.eq('contest_id', options.tenderId);
    }

    const { data: draft, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError as PostgrestError };
    }

    if (!draft) {
      return {
        success: false,
        error: new Error('Brak szkicu oferty do usunięcia.') as PostgrestError,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: deletedRows, error: deleteError } = await (supabase as any)
      .from('contest_offers')
      .delete()
      .eq('id', draft.id)
      .eq('contractor_id', contractorId)
      .eq('company_id', access.companyId)
      .eq('status', 'draft')
      .select('id');

    if (deleteError) {
      return { success: false, error: deleteError as PostgrestError };
    }

    // RLS can silently match 0 rows with no error — treat that as failure.
    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      return {
        success: false,
        error: new Error('Nie udało się usunąć szkicu oferty.') as PostgrestError,
      };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: (err instanceof Error ? err : new Error(String(err))) as PostgrestError,
    };
  }
}

export async function submitTenderBid(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  contractorId: string,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): Promise<{ data: TenderBidRowLite | null; error: PostgrestError | null }> {
  const profileSnapshot = await loadContractorFormalProfileSnapshot(supabase, contractorId);
  const validationError = validateContestOfferSubmit(form, contestInfo, profileSnapshot);
  if (validationError) {
    return { data: null, error: new Error(validationError) as PostgrestError };
  }

  const { form: uploadedForm, error: uploadError } = await uploadStagedFiles(
    contractorId,
    tenderId,
    form,
  );
  if (uploadError) {
    return { data: null, error: new Error(uploadError) as PostgrestError };
  }

  const row = buildRowFromForm(uploadedForm, 4, 'submitted');
  const details = row.offer_details as ContestOfferDetails;
  if (details.netPrice != null && details.vatRate) {
    details.grossPrice = computeGrossFromNet(details.netPrice, details.vatRate);
    row.offer_details = details;
    row.financial_proposal = JSON.stringify({
      netPrice: details.netPrice,
      vatRate: details.vatRate,
      grossPrice: details.grossPrice,
      warrantyMonths: details.warrantyMonths,
      guaranteeMonths: details.guaranteeMonths,
    });
  }

  try {
    const access = await ensureContractorCanBid(supabase, contractorId);
    if ('error' in access) {
      return { data: null, error: access.error };
    }

    const { state, bid } = await fetchTenderBidOfferState(supabase, tenderId, contractorId);
    if (state === 'submitted') {
      return {
        data: null,
        error: new Error(CONTEST_OFFER_ERRORS.alreadySubmitted) as PostgrestError,
      };
    }

    if (state === 'draft' && bid?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contest_offers')
        .update(row)
        .eq('id', bid.id)
        .select()
        .single();
      if (error) return { data: null, error: userFacingOfferError(error) };
      return { data: data as TenderBidRowLite, error: null };
    }

    return insertOfferRow(supabase, tenderId, contractorId, access.companyId, row);
  } catch (err) {
    return {
      data: null,
      error: userFacingOfferError(err),
    };
  }
}

/**
 * Rebuild wizard form from a draft/submitted bid.
 * Prefer `offer_details` attachment slots; only fall back to the flat `attachments`
 * column when details have none. Merging both duplicated extras (same React keys).
 */
export function hydrateContestOfferFormFromBid(bid: TenderBidRowLite | null): ContestOfferFormData {
  if (!bid?.offer_details) {
    const form = offerDetailsToFormData(null);
    if (bid?.experience_summary) {
      form.referencesText = bid.experience_summary;
    }
    mergeFlatAttachmentsIntoForm(form, bid?.attachments);
    return migrateLegacyOfferAttachments(form);
  }

  const form = offerDetailsToFormData(bid.offer_details as ContestOfferDetails);
  if (bid.experience_summary && !form.referencesText) {
    form.referencesText = bid.experience_summary;
  }

  const hasDetailsAttachments =
    Object.keys(form.formalAttachments).length > 0 || form.extraAttachments.length > 0;
  if (!hasDetailsAttachments) {
    mergeFlatAttachmentsIntoForm(form, bid.attachments);
  }

  form.extraAttachments = dedupeExtraAttachments(form.extraAttachments);
  return migrateLegacyOfferAttachments(form);
}

function dedupeExtraAttachments(
  extras: ContestOfferFormData['extraAttachments'],
): ContestOfferFormData['extraAttachments'] {
  const seen = new Set<string>();
  const result: ContestOfferFormData['extraAttachments'] = [];
  for (const att of extras) {
    const key = att.path ? `path:${att.path}` : `id:${att.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(att);
  }
  return result;
}

function mergeFlatAttachmentsIntoForm(
  form: ContestOfferFormData,
  attachments: unknown,
): void {
  if (!attachments || !Array.isArray(attachments)) return;

  for (const att of attachments as Array<{
    requirementKey?: string;
    source?: string;
    name: string;
    path: string;
    url?: string;
    type: string;
    id: string;
    size?: number;
  }>) {
    if (
      att.requirementKey &&
      att.requirementKey !== 'deposit' &&
      att.requirementKey !== 'other' &&
      att.requirementKey !== 'offerDocumentation'
    ) {
      form.formalAttachments[att.requirementKey as FormalRequirementKey] = {
        id: att.id,
        name: att.name,
        path: att.path,
        url: att.url,
        type: att.type === 'image' ? 'image' : 'document',
        source: att.source === 'profile' ? 'profile' : 'override',
        requirementKey: att.requirementKey as FormalRequirementKey,
        size: att.size,
      };
    } else {
      const alreadyPresent = form.extraAttachments.some(
        (existing) => existing.id === att.id || (att.path && existing.path === att.path),
      );
      if (alreadyPresent) continue;
      form.extraAttachments.push({
        id: att.id,
        name: att.name,
        path: att.path,
        url: att.url,
        type: att.type === 'image' ? 'image' : 'document',
        source: 'extra',
        requirementKey: att.requirementKey as
          | 'deposit'
          | 'offerDocumentation'
          | 'other'
          | undefined,
        size: att.size,
      });
    }
  }
}

export function contestCountdownLabel(deadlineIso: string): string {
  const end = new Date(deadlineIso);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return 'Termin składania ofert minął';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `Pozostało ${days} dni, ${hours} godzin`;
}

export function completionDateWarning(
  offeredDate: string,
  managerCompletionDate: string | null,
): string | null {
  if (!managerCompletionDate || !offeredDate) return null;
  const offered = new Date(offeredDate);
  const preferred = new Date(managerCompletionDate);
  if (Number.isNaN(offered.getTime()) || Number.isNaN(preferred.getTime())) return null;
  if (offered > preferred) {
    return 'Twój termin wykonania jest późniejszy niż preferowany przez zarządcę.';
  }
  return null;
}

export type { SiteVisitType };
