'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { acceptManagerTenderOffer } from '../../../lib/database/offer-selection';
import { notifyContestCancelledToContractors, notifyContestOfferResolution } from '../../../lib/notifications/contest-resolution';
import { deleteManagerContestDraft } from '../../../lib/database/manager-contests';
import { canCancelContest } from '../../../lib/tender-workflow-status';

const KONKURSY_PATH = '/panel-zarzadcy/konkursy';

function revalidateKonkursy(tenderId?: string): void {
  revalidatePath(KONKURSY_PATH);
  if (tenderId) {
    revalidatePath(`${KONKURSY_PATH}/porownaj/${tenderId}`);
  }
}

export async function acceptTenderOfferAction(
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
    revalidateKonkursy(tenderId.trim());
    revalidatePath('/panel-zarzadcy/zgloszenia');
    revalidatePath('/panel-zarzadcy/zamowienia');
    revalidatePath('/panel-wykonawcy/zamowienia');
  }

  return result;
}

export async function cancelContestAction(
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

  revalidateKonkursy(tenderId.trim());
  return { success: true };
}

export async function abandonContestDraftAction(
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
    revalidateKonkursy(tenderId.trim());
    revalidatePath('/panel-zarzadcy/zgloszenia');
  }

  return result;
}
