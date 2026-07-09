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
  requiredFormalKeys,
} from '../../types/contest-offer';
import type { SiteVisitType } from '../../types/tender-contest';
import { uploadContestOfferStagedFiles } from '../contest-offer/upload-staged-offer-files';

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
        companyError instanceof Error
          ? companyError.message
          : 'Contractor must have a company to submit bids',
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
    experience_summary: form.referencesText.trim() || null,
    attachments: attachments.length > 0 ? attachments : null,
    offer_details: details,
    status,
    ...(status === 'submitted' ? { submitted_at: new Date().toISOString() } : {}),
  };
}

export type ContestOfferWizardStep = 1 | 2 | 3 | 4;

export interface ContestOfferFieldErrors {
  offerDocumentation?: string;
  proposedCompletionDate?: string;
  siteVisitConfirmed?: string;
  referencesText?: string;
  netPrice?: string;
  warrantyMonths?: string;
  guaranteeMonths?: string;
  paymentTermsAccepted?: string;
  deposit?: string;
  formal?: Partial<Record<FormalRequirementKey, string>>;
}

export const FORMAL_REQUIREMENT_LABELS: Record<FormalRequirementKey, string> = {
  insuranceOc: 'Polisa OC',
  zusUsCertificates: 'Zaświadczenia ZUS/US',
  references: 'Referencje – wykaz zrealizowanych prac',
  professionalCertificates: 'Certyfikaty zawodowe',
  professionalLicenses: 'Uprawnienia zawodowe',
};

export function hasContestOfferFieldErrors(errors: ContestOfferFieldErrors): boolean {
  if (
    errors.offerDocumentation ||
    errors.proposedCompletionDate ||
    errors.siteVisitConfirmed ||
    errors.referencesText ||
    errors.netPrice ||
    errors.warrantyMonths ||
    errors.guaranteeMonths ||
    errors.paymentTermsAccepted ||
    errors.deposit
  ) {
    return true;
  }
  return Boolean(errors.formal && Object.keys(errors.formal).length > 0);
}

function hasOfferDocumentation(form: ContestOfferFormData): boolean {
  const offerDocs = form.extraAttachments.filter((a) => a.requirementKey === 'offerDocumentation');
  const staged = form.stagedFiles.offerDocumentation?.length ?? 0;
  return offerDocs.length > 0 || staged > 0;
}

export function migrateLegacyOfferAttachments(form: ContestOfferFormData): ContestOfferFormData {
  const hasOfferDocKey = form.extraAttachments.some((a) => a.requirementKey === 'offerDocumentation');
  if (hasOfferDocKey) return form;

  const extraAttachments = form.extraAttachments.map((a) =>
    a.requirementKey === 'other' ? { ...a, requirementKey: 'offerDocumentation' as const } : a,
  );
  const stagedFiles = { ...form.stagedFiles };
  if (stagedFiles.other?.length && !stagedFiles.offerDocumentation?.length) {
    stagedFiles.offerDocumentation = stagedFiles.other;
    delete stagedFiles.other;
  }

  return { ...form, extraAttachments, stagedFiles };
}

export function getContestOfferStepFieldErrors(
  step: ContestOfferWizardStep,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): ContestOfferFieldErrors {
  const errors: ContestOfferFieldErrors = {};

  if (step === 1) {
    if (!hasOfferDocumentation(form)) {
      errors.offerDocumentation = 'Dodaj co najmniej jeden plik dokumentacji ofertowej';
    }
    return errors;
  }

  if (step === 2) {
    if (!form.proposedCompletionDate) {
      errors.proposedCompletionDate = 'Podaj oferowany termin wykonania';
    }
    if (contestInfo.siteVisitType === 'mandatory' && !form.siteVisitConfirmed) {
      errors.siteVisitConfirmed = 'Potwierdź odbycie wizji lokalnej';
    }
    return errors;
  }

  if (step === 3) {
    const formal: Partial<Record<FormalRequirementKey, string>> = {};
    const required = requiredFormalKeys(contestInfo.formalRequirements);
    for (const key of required) {
      if (key === 'references') {
        if (!form.referencesText.trim()) {
          errors.referencesText = 'Uzupełnij wykaz zrealizowanych prac';
        }
        continue;
      }
      const attached = form.formalAttachments[key];
      const staged = form.stagedFiles[key]?.length;
      if (!attached && !staged) {
        formal[key] = `Wgraj lub wybierz z profilu: ${FORMAL_REQUIREMENT_LABELS[key]}`;
      }
    }
    if (Object.keys(formal).length > 0) {
      errors.formal = formal;
    }
    return errors;
  }

  if (step === 4) {
    const net = Number.parseFloat(form.netPrice);
    if (!form.netPrice.trim() || Number.isNaN(net) || net <= 0) {
      errors.netPrice = 'Podaj cenę netto';
    }
    if (!form.warrantyMonths) {
      errors.warrantyMonths = 'Wybierz okres gwarancji';
    }
    if (!form.guaranteeMonths) {
      errors.guaranteeMonths = 'Wybierz okres rękojmi';
    }
    if (
      contestInfo.paymentTerms.mode === 'custom' &&
      (contestInfo.paymentTerms.customDays ?? 0) > 14 &&
      !form.paymentTermsAccepted
    ) {
      errors.paymentTermsAccepted = 'Zaakceptuj wymagany termin płatności';
    }
    if (contestInfo.depositRequired) {
      const depositFile = form.extraAttachments.find((a) => a.requirementKey === 'deposit');
      const stagedDeposit = form.stagedFiles.deposit?.length;
      if (!depositFile && !stagedDeposit) {
        errors.deposit = 'Wgraj potwierdzenie przelewu wadium';
      }
    }
    return errors;
  }

  return errors;
}

export function getContestOfferAllFieldErrors(
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): ContestOfferFieldErrors {
  const step1 = getContestOfferStepFieldErrors(1, form, contestInfo);
  const step2 = getContestOfferStepFieldErrors(2, form, contestInfo);
  const step3 = getContestOfferStepFieldErrors(3, form, contestInfo);
  const step4 = getContestOfferStepFieldErrors(4, form, contestInfo);

  const formal = { ...step3.formal };

  return {
    offerDocumentation: step1.offerDocumentation,
    proposedCompletionDate: step2.proposedCompletionDate,
    siteVisitConfirmed: step2.siteVisitConfirmed,
    referencesText: step3.referencesText,
    netPrice: step4.netPrice,
    warrantyMonths: step4.warrantyMonths,
    guaranteeMonths: step4.guaranteeMonths,
    paymentTermsAccepted: step4.paymentTermsAccepted,
    deposit: step4.deposit,
    ...(Object.keys(formal).length > 0 ? { formal } : {}),
  };
}

export function filterFieldErrorsForStep(
  step: ContestOfferWizardStep,
  errors: ContestOfferFieldErrors,
): ContestOfferFieldErrors {
  switch (step) {
    case 1:
      return { offerDocumentation: errors.offerDocumentation };
    case 2:
      return {
        proposedCompletionDate: errors.proposedCompletionDate,
        siteVisitConfirmed: errors.siteVisitConfirmed,
      };
    case 3:
      return {
        referencesText: errors.referencesText,
        formal: errors.formal,
      };
    case 4:
      return {
        netPrice: errors.netPrice,
        warrantyMonths: errors.warrantyMonths,
        guaranteeMonths: errors.guaranteeMonths,
        paymentTermsAccepted: errors.paymentTermsAccepted,
        deposit: errors.deposit,
      };
    default:
      return {};
  }
}

export function firstContestOfferStepWithErrors(
  errors: ContestOfferFieldErrors,
): ContestOfferWizardStep | null {
  if (errors.offerDocumentation) return 1;
  if (errors.proposedCompletionDate || errors.siteVisitConfirmed) return 2;
  if (errors.referencesText || (errors.formal && Object.keys(errors.formal).length > 0)) {
    return 3;
  }
  if (
    errors.netPrice ||
    errors.warrantyMonths ||
    errors.guaranteeMonths ||
    errors.paymentTermsAccepted ||
    errors.deposit
  ) {
    return 4;
  }
  return null;
}

function firstFieldErrorMessage(errors: ContestOfferFieldErrors): string | null {
  if (errors.offerDocumentation) return errors.offerDocumentation;
  if (errors.proposedCompletionDate) return errors.proposedCompletionDate;
  if (errors.siteVisitConfirmed) return errors.siteVisitConfirmed;
  if (errors.referencesText) return errors.referencesText;
  if (errors.formal) {
    const first = Object.values(errors.formal)[0];
    if (first) return first;
  }
  if (errors.netPrice) return errors.netPrice;
  if (errors.warrantyMonths) return errors.warrantyMonths;
  if (errors.guaranteeMonths) return errors.guaranteeMonths;
  if (errors.paymentTermsAccepted) return errors.paymentTermsAccepted;
  if (errors.deposit) return errors.deposit;
  return null;
}

export function isFormalRequirementComplete(
  form: ContestOfferFormData,
  key: FormalRequirementKey,
): boolean {
  if (key === 'references') {
    return form.referencesText.trim().length > 0;
  }
  return Boolean(form.formalAttachments[key] || form.stagedFiles[key]?.length);
}

export function countFormalRequirementsProgress(
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): { completed: number; total: number } {
  const keys = requiredFormalKeys(contestInfo.formalRequirements);
  const completed = keys.filter((key) => isFormalRequirementComplete(form, key)).length;
  return { completed, total: keys.length };
}

export function validateContestOfferStep(
  step: ContestOfferWizardStep,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): string | null {
  const errors = getContestOfferStepFieldErrors(step, form, contestInfo);
  return firstFieldErrorMessage(errors);
}

export function validateContestOfferSubmit(
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): string | null {
  const errors = getContestOfferAllFieldErrors(form, contestInfo);
  return firstFieldErrorMessage(errors);
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
        error: new Error('Oferta została już złożona.') as PostgrestError,
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
        return { data: null, error: error as PostgrestError };
      }
      return { data: data as TenderBidRowLite, error: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('contest_offers')
      .insert({
        contest_id: tenderId,
        contractor_id: contractorId,
        company_id: access.companyId,
        ...row,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error as PostgrestError };
    }
    return { data: data as TenderBidRowLite, error: null };
  } catch (err) {
    return {
      data: null,
      error: (err instanceof Error ? err : new Error(String(err))) as PostgrestError,
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
    const { error: deleteError } = await (supabase as any)
      .from('contest_offers')
      .delete()
      .eq('id', draft.id)
      .eq('contractor_id', contractorId)
      .eq('company_id', access.companyId)
      .eq('status', 'draft');

    if (deleteError) {
      return { success: false, error: deleteError as PostgrestError };
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
  const validationError = validateContestOfferSubmit(form, contestInfo);
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
        error: new Error(
          'Już złożyłeś ofertę na ten konkurs. Nie możesz złożyć więcej niż jednej oferty.',
        ) as PostgrestError,
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
      if (error) return { data: null, error: error as PostgrestError };
      return { data: data as TenderBidRowLite, error: null };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('contest_offers')
      .insert({
        contest_id: tenderId,
        contractor_id: contractorId,
        company_id: access.companyId,
        ...row,
      })
      .select()
      .single();

    if (error) return { data: null, error: error as PostgrestError };
    return { data: data as TenderBidRowLite, error: null };
  } catch (err) {
    return {
      data: null,
      error: (err instanceof Error ? err : new Error(String(err))) as PostgrestError,
    };
  }
}

export function hydrateContestOfferFormFromBid(bid: TenderBidRowLite | null): ContestOfferFormData {
  if (!bid?.offer_details) {
    return offerDetailsToFormData(null);
  }
  const form = offerDetailsToFormData(bid.offer_details as ContestOfferDetails);
  if (bid.experience_summary && !form.referencesText) {
    form.referencesText = bid.experience_summary;
  }
  if (bid.attachments && Array.isArray(bid.attachments)) {
    for (const att of bid.attachments as Array<{
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
  return migrateLegacyOfferAttachments(form);
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
