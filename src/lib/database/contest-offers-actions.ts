'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../supabase/server';
import type { ContestInfo } from '../../types/job';
import type { ContestOfferFormData } from '../../types/contest-offer';
import type { PostgrestError } from '@supabase/supabase-js';
import { instrumentServerAction } from '../sentry/instrument-server-action';
import {
  deleteTenderBidDraft as deleteTenderBidDraftWithClient,
  submitTenderBid as submitTenderBidWithClient,
  upsertTenderBidDraft as upsertTenderBidDraftWithClient,
  type ContestOfferWizardStep,
  type TenderBidRowLite,
} from './contest-offers';

async function submitTenderBidImpl(
  tenderId: string,
  contractorId: string,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): Promise<{ data: TenderBidRowLite | null; error: PostgrestError | null }> {
  const supabase = await createClient();
  return submitTenderBidWithClient(supabase, tenderId, contractorId, form, contestInfo);
}

async function upsertTenderBidDraftImpl(
  tenderId: string,
  contractorId: string,
  form: ContestOfferFormData,
  currentStep: ContestOfferWizardStep,
): Promise<{ data: TenderBidRowLite | null; error: PostgrestError | null }> {
  const supabase = await createClient();
  return upsertTenderBidDraftWithClient(supabase, tenderId, contractorId, form, currentStep);
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
    return { success: false, error: 'Wymagane logowanie' };
  }

  const result = await deleteTenderBidDraftWithClient(supabase, input.contractorId, {
    tenderId: input.tenderId,
    bidId: input.bidId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message ?? 'Nie udało się odrzucić szkicu oferty',
    };
  }

  const revalidateTargets = ['/panel-wykonawcy/aplikacje', '/panel-wykonawcy'];
  if (input.tenderId) {
    revalidateTargets.push(`/konkurs/${input.tenderId}`);
  }
  for (const path of revalidateTargets) {
    revalidatePath(path);
  }

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
