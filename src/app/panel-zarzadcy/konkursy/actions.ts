'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { assertNotImpersonating, IMPERSONATION_READ_ONLY_ERROR } from '../../../lib/auth/guard-impersonation';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { getPostHogClient } from '../../../lib/posthog-server';
import { acceptManagerTenderOffer } from '../../../lib/database/offer-selection';
import { notifyContestCancelledToContractors, notifyContestOfferResolution } from '../../../lib/notifications/contest-resolution';
import { notifyNewContestAudience } from '../../../lib/notifications/matched-contest';
import { deleteManagerContestDraft } from '../../../lib/database/manager-contests';
import { canCancelContest } from '../../../lib/tender-workflow-status';
import { instrumentServerAction } from '../../../lib/sentry/instrument-server-action';

const KONKURSY_PATH = '/panel-zarzadcy/konkursy';

function revalidateKonkursy(tenderId?: string): void {
  revalidatePath(KONKURSY_PATH);
  if (tenderId) {
    revalidatePath(`${KONKURSY_PATH}/porownaj/${tenderId}`);
  }
}

async function acceptTenderOfferActionImpl(
  tenderId: string,
  bidId: string,
  selectionJustification?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!tenderId?.trim() || !bidId?.trim()) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  if (!selectionJustification?.trim()) {
    return { success: false, error: 'Uzasadnienie wyboru jest wymagane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  try {
    await assertNotImpersonating(user.id);
  } catch {
    return { success: false, error: IMPERSONATION_READ_ONLY_ERROR };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const result = await acceptManagerTenderOffer(supabase, {
    tenderId: tenderId.trim(),
    bidId: bidId.trim(),
    managerId: user.id,
    companyId: company.id,
    selectionJustification,
  });

  if (result.success) {
    try {
      await notifyContestOfferResolution(tenderId.trim(), bidId.trim());
    } catch (notifyError) {
      console.error('notifyContestOfferResolution:', notifyError);
    }
    getPostHogClient()?.capture({
      distinctId: user.id,
      event: 'contest_offer_accepted',
      properties: { tender_id: tenderId.trim(), bid_id: bidId.trim() },
    });
    revalidateKonkursy(tenderId.trim());
    revalidatePath('/panel-zarzadcy/zgloszenia');
    revalidatePath('/panel-zarzadcy/zamowienia');
    revalidatePath('/panel-wykonawcy/zamowienia');
  }

  return result;
}

async function cancelContestActionImpl(
  tenderId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!tenderId?.trim()) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  try {
    await assertNotImpersonating(user.id);
  } catch {
    return { success: false, error: IMPERSONATION_READ_ONLY_ERROR };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender, error: fetchErr } = await (supabase as any)
    .from('contests')
    .select('id, status, manager_id, company_id')
    .eq('id', tenderId.trim())
    .maybeSingle();

  if (fetchErr || !tender) {
    return { success: false, error: 'Nie znaleziono konkursu' };
  }

  if (tender.manager_id !== user.id || tender.company_id !== company.id) {
    return { success: false, error: 'Brak uprawnień' };
  }

  if (!canCancelContest(tender.status)) {
    return { success: false, error: 'Tego konkursu nie można już unieważnić' };
  }

  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (supabase as any)
    .from('contests')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', tenderId.trim());

  if (updateErr) {
    return { success: false, error: updateErr.message || 'Nie udało się unieważnić konkursu' };
  }

  try {
    await notifyContestCancelledToContractors(supabase, tenderId.trim());
  } catch (notifyError) {
    console.error('notifyContestCancelledToContractors:', notifyError);
  }

  getPostHogClient()?.capture({
    distinctId: user.id,
    event: 'contest_cancelled',
    properties: { tender_id: tenderId.trim() },
  });
  revalidateKonkursy(tenderId.trim());
  return { success: true };
}

async function abandonContestDraftActionImpl(
  tenderId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!tenderId?.trim()) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  try {
    await assertNotImpersonating(user.id);
  } catch {
    return { success: false, error: IMPERSONATION_READ_ONLY_ERROR };
  }

  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    user.id,
  );

  if (companyError || !company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const result = await deleteManagerContestDraft(supabase, {
    tenderId: tenderId.trim(),
    managerId: user.id,
    companyId: company.id,
  });

  if (result.success) {
    getPostHogClient()?.capture({
      distinctId: user.id,
      event: 'contest_draft_abandoned',
      properties: { tender_id: tenderId.trim() },
    });
    revalidateKonkursy(tenderId.trim());
    revalidatePath('/panel-zarzadcy/zgloszenia');
  }

  return result;
}

export const acceptTenderOfferAction = instrumentServerAction(
  'acceptTenderOfferAction',
  acceptTenderOfferActionImpl,
);
export const cancelContestAction = instrumentServerAction(
  'cancelContestAction',
  cancelContestActionImpl,
);
export const abandonContestDraftAction = instrumentServerAction(
  'abandonContestDraftAction',
  abandonContestDraftActionImpl,
);

async function notifySavedUsersOfNewContestActionImpl(
  contestId: string,
): Promise<{ success: boolean }> {
  if (!contestId?.trim()) {
    return { success: false };
  }
  try {
    await notifyNewContestAudience(contestId.trim());
    return { success: true };
  } catch (error) {
    console.error('notifySavedUsersOfNewContestAction:', error);
    return { success: false };
  }
}

/** Fire-and-forget from contest publish: bookmark (OPD-152) + service match (OPD-148). */
export const notifySavedUsersOfNewContestAction = instrumentServerAction(
  'notifySavedUsersOfNewContestAction',
  notifySavedUsersOfNewContestActionImpl,
);
