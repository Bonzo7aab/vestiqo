import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { createAdminClientOrNull } from '../supabase/admin';
import {
  buildContractorOfferAcceptedMessage,
  buildContractorOfferRejectedMessage,
  createOpd41Notification,
} from './opd41-server';

export async function notifyContestOfferResolution(
  tenderId: string,
  winningBidId: string,
): Promise<void> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    console.warn('[notifyContestOfferResolution] admin client unavailable');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contest } = await (admin as any)
    .from('contests')
    .select('id, title')
    .eq('id', tenderId.trim())
    .maybeSingle();

  const contestTitle = (contest?.title as string | undefined) ?? 'konkurs';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: offers } = await (admin as any)
    .from('contest_offers')
    .select('id, contractor_id, status')
    .eq('contest_id', tenderId.trim())
    .in('status', ['accepted', 'rejected']);

  if (!offers?.length) {
    return;
  }

  const openContestsUrl = '/';

  for (const offer of offers as Array<{
    id: string;
    contractor_id: string;
    status: string | null;
  }>) {
    const contractorId = offer.contractor_id?.trim();
    if (!contractorId) continue;

    if (offer.id === winningBidId.trim() && offer.status === 'accepted') {
      await createOpd41Notification({
        supabase: admin,
        userId: contractorId,
        kind: 'contractor_contest_resolution',
        type: 'contest_awarded',
        title: 'Wybrano Twoją ofertę',
        message: buildContractorOfferAcceptedMessage(contestTitle),
        data: {
          contestId: tenderId.trim(),
          tenderId: tenderId.trim(),
          title: contestTitle,
        },
        actionUrl: '/panel-wykonawcy/zamowienia',
        priority: 'high',
      });
      continue;
    }

    if (offer.status === 'rejected') {
      await createOpd41Notification({
        supabase: admin,
        userId: contractorId,
        kind: 'contractor_contest_resolution',
        type: 'bid_status_update',
        title: 'Rozstrzygnięcie konkursu',
        message: buildContractorOfferRejectedMessage(contestTitle),
        data: {
          contestId: tenderId.trim(),
          tenderId: tenderId.trim(),
          title: contestTitle,
        },
        actionUrl: openContestsUrl,
      });
    }
  }
}

export async function notifyContestCancelledToContractors(
  _supabase: SupabaseClient<Database>,
  tenderId: string,
): Promise<void> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    console.warn('[notifyContestCancelledToContractors] admin client unavailable');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contest } = await (admin as any)
    .from('contests')
    .select('id, title')
    .eq('id', tenderId.trim())
    .maybeSingle();

  const contestTitle = (contest?.title as string | undefined) ?? 'konkurs';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: offers } = await (admin as any)
    .from('contest_offers')
    .select('contractor_id')
    .eq('contest_id', tenderId.trim())
    .in('status', ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected']);

  const notified = new Set<string>();

  for (const offer of (offers ?? []) as Array<{ contractor_id: string }>) {
    const contractorId = offer.contractor_id?.trim();
    if (!contractorId || notified.has(contractorId)) continue;
    notified.add(contractorId);

    await createOpd41Notification({
      supabase: admin,
      userId: contractorId,
      kind: 'contractor_contest_resolution',
      type: 'bid_status_update',
      title: 'Rozstrzygnięcie konkursu',
      message: buildContractorOfferRejectedMessage(contestTitle),
      data: {
        contestId: tenderId.trim(),
        tenderId: tenderId.trim(),
        title: contestTitle,
      },
      actionUrl: '/',
    });
  }
}
