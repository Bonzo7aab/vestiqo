'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../supabase/server';
import type { ContestInfo } from '../../types/job';
import type { ContestOfferFormData } from '../../types/contest-offer';
import type { PostgrestError } from '@supabase/supabase-js';
import { instrumentServerAction } from '../sentry/instrument-server-action';
import { cancelTenderBid } from './jobs';
import type { ContestOfferWizardStep } from '../contest-offer/offer-form-validation';
import {
  deleteTenderBidDraft as deleteTenderBidDraftWithClient,
  submitTenderBid as submitTenderBidWithClient,
  upsertTenderBidDraft as upsertTenderBidDraftWithClient,
  type TenderBidRowLite,
} from './contest-offers';
import {
  CONTEST_OFFER_ERRORS,
  contestOfferErrorFromUnknown,
} from '../contest-offer/error-messages';

function revalidateContractorOffersPaths(tenderId?: string): void {
  revalidatePath('/panel-wykonawcy/aplikacje');
  revalidatePath('/panel-wykonawcy');
  revalidatePath('/');
  revalidatePath('/panel-zarzadcy/konkursy');
  revalidatePath('/panel-zarzadcy/zgloszenia');
  if (tenderId) {
    revalidatePath('/konkurs', 'layout');
    revalidatePath(`/konkurs/${tenderId}`);
  }
}

function toClientOfferResult<T>(result: {
  data: T | null;
  error: PostgrestError | null;
}): { data: T | null; error: { message: string } | null } {
  if (result.error) {
    return { data: null, error: { message: contestOfferErrorFromUnknown(result.error) } };
  }
  return {
    data: result.data ? (JSON.parse(JSON.stringify(result.data)) as T) : null,
    error: null,
  };
}

async function submitTenderBidImpl(
  tenderId: string,
  contractorId: string,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): Promise<{ data: TenderBidRowLite | null; error: { message: string } | null }> {
  const supabase = await createClient();
  const result = await submitTenderBidWithClient(supabase, tenderId, contractorId, form, contestInfo);

  if (!result.error) {
    revalidateContractorOffersPaths(tenderId);
  }

  return toClientOfferResult(result);
}

async function upsertTenderBidDraftImpl(
  tenderId: string,
  contractorId: string,
  form: ContestOfferFormData,
  currentStep: ContestOfferWizardStep,
): Promise<{ data: TenderBidRowLite | null; error: { message: string } | null }> {
  const supabase = await createClient();
  return toClientOfferResult(
    await upsertTenderBidDraftWithClient(supabase, tenderId, contractorId, form, currentStep),
  );
}

async function abandonTenderBidDraftActionImpl(input: {
  contractorId: string;
  tenderId?: string;
  bidId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== input.contractorId) {
    return { success: false, error: CONTEST_OFFER_ERRORS.notLoggedIn };
  }

  const result = await deleteTenderBidDraftWithClient(supabase, input.contractorId, {
    tenderId: input.tenderId,
    bidId: input.bidId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error
        ? contestOfferErrorFromUnknown(result.error)
        : CONTEST_OFFER_ERRORS.abandonFailed,
    };
  }

  revalidateContractorOffersPaths(input.tenderId);
  return { success: true };
}

async function withdrawTenderBidActionImpl(input: {
  bidId: string;
  tenderId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: CONTEST_OFFER_ERRORS.notLoggedIn };
  }

  const result = await cancelTenderBid(supabase, input.bidId, user.id);

  if (result.error) {
    return {
      success: false,
      error: contestOfferErrorFromUnknown(result.error),
    };
  }

  revalidateContractorOffersPaths(input.tenderId);
  return { success: true };
}

export const submitTenderBid = instrumentServerAction('submitTenderBid', submitTenderBidImpl);
export const upsertTenderBidDraft = instrumentServerAction(
  'upsertTenderBidDraft',
  upsertTenderBidDraftImpl,
);
export const abandonTenderBidDraftAction = instrumentServerAction(
  'abandonTenderBidDraftAction',
  abandonTenderBidDraftActionImpl,
);
export const withdrawTenderBidAction = instrumentServerAction(
  'withdrawTenderBidAction',
  withdrawTenderBidActionImpl,
);
