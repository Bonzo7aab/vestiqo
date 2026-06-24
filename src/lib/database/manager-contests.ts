import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { CONTEST_TENDERS_OR_FILTER } from './jobs';
import { getContestWorkflowStatusLabel } from '../tender-workflow-status';
import {
  fetchContestCommentCounts,
  fetchContestQuestionCounts,
  fetchUnansweredContestQuestionCounts,
  fetchUnseenContestQuestionCounts,
} from './questions';
import { countsTowardContestOfferCount } from './contest-offer-count';
import { fetchReviewedTenderIdsForReviewer } from './reviews';

export interface ManagerContest {
  id: string;
  title: string;
  locationLabel: string;
  submissionDeadline: string;
  status: string;
  offersCount: number;
  hasSelectedOffer: boolean;
  canEdit: boolean;
  selectedContractorName?: string;
  selectedContractorCompanyId?: string;
  createdAt: string;
  /** Unanswered questions not yet opened by manager in Q&A dialog */
  unseenQuestionsCount: number;
  /** Total questions awaiting manager answer */
  unansweredQuestionsCount: number;
  /** All Q&A threads on this contest */
  questionsCount: number;
  /** Published manager comments on contest questions */
  commentsCount: number;
  /** Manager already submitted cooperation review for selected offer */
  hasCooperationReview: boolean;
  /** Set when contest was created via Ponów from a previous edition */
  renewedFromContestId: string | null;
}

interface TenderContestRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  submission_deadline: string;
  managed_entity_id: string | null;
  selection_criteria: unknown;
  formal_requirements: unknown;
  renewed_from_contest_id?: string | null;
  address?: string | null;
  managed_entity?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
    entity_type?: string | null;
    nip?: string | null;
  } | null;
}

export function formatContestLocationLabel(row: {
  address?: string | null;
  managed_entity?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
}): string {
  const entity = row.managed_entity;
  if (entity?.address || entity?.city) {
    const parts = [entity.address, entity.city].filter(Boolean);
    return parts.join(', ');
  }
  if (row.address?.trim()) return row.address.trim();
  if (entity?.name?.trim()) return entity.name.trim();
  return '—';
}

/**
 * Counts submitted contest offers (excludes draft/cancelled and admin-suspended).
 */
async function fetchContestOfferCountsById(
  supabase: SupabaseClient<Database>,
  contestIds: string[],
): Promise<Record<string, number>> {
  if (contestIds.length === 0) return {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bids } = await (supabase as any)
    .from('contest_offers')
    .select('contest_id, status, admin_moderation_status')
    .in('contest_id', contestIds);

  const counts: Record<string, number> = {};
  for (const row of bids || []) {
    const contestId = row.contest_id as string;
    const status = row.status as string;
    const moderationStatus = row.admin_moderation_status as string | null | undefined;
    if (
      countsTowardContestOfferCount(status) &&
      moderationStatus !== 'suspended'
    ) {
      counts[contestId] = (counts[contestId] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Moves contests past submission deadline:
 * - active + offers → evaluation
 * - active/evaluation + no offers → no_offers
 */
export async function advanceContestsPastSubmissionDeadline(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<void> {
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activePast } = await (supabase as any)
    .from('contests')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .or(CONTEST_TENDERS_OR_FILTER)
    .lt('submission_deadline', now);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evaluationPast } = await (supabase as any)
    .from('contests')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'evaluation')
    .or(CONTEST_TENDERS_OR_FILTER)
    .lt('submission_deadline', now);

  const activeIds = ((activePast || []) as { id: string }[]).map((r) => r.id);
  const evaluationIds = ((evaluationPast || []) as { id: string }[]).map((r) => r.id);
  const allIds = [...new Set([...activeIds, ...evaluationIds])];

  if (allIds.length === 0) return;

  const offerCounts = await fetchContestOfferCountsById(supabase, allIds);

  const toEvaluation = activeIds.filter((id) => (offerCounts[id] ?? 0) > 0);
  const toNoOffers = [
    ...activeIds.filter((id) => (offerCounts[id] ?? 0) === 0),
    ...evaluationIds.filter((id) => (offerCounts[id] ?? 0) === 0),
  ];

  if (toEvaluation.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('contests')
      .update({ status: 'evaluation', updated_at: now })
      .in('id', toEvaluation)
      .eq('company_id', companyId);
  }

  if (toNoOffers.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('contests')
      .update({ status: 'no_offers', updated_at: now })
      .in('id', toNoOffers)
      .eq('company_id', companyId);
  }
}

/**
 * Contest-only list for manager Konkursy tab (OPD-60).
 */
export async function fetchManagerContests(
  supabase: SupabaseClient<Database>,
  companyId: string,
  managerUserId?: string,
): Promise<ManagerContest[]> {
  await advanceContestsPastSubmissionDeadline(supabase, companyId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tenderRows, error } = await (supabase as any)
    .from('contests')
    .select(
      `
      id,
      title,
      status,
      created_at,
      submission_deadline,
      managed_entity_id,
      selection_criteria,
      formal_requirements,
      renewed_from_contest_id,
      address,
      managed_entity:managed_housing_entities!contests_managed_entity_id_fkey (
        name,
        address,
        city,
        entity_type,
        nip
      )
    `,
    )
    .eq('company_id', companyId)
    .or(CONTEST_TENDERS_OR_FILTER)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchManagerContests:', error);
    return [];
  }

  const contestRows = (tenderRows || []) as TenderContestRow[];
  const tenderIds = contestRows.map((t) => t.id);

  const offerCounts: Record<string, number> = {};
  const hasSelected: Record<string, boolean> = {};
  const winnerNames: Record<string, string> = {};
  const winnerCompanyIds: Record<string, string> = {};

  if (tenderIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bids } = await (supabase as any)
      .from('contest_offers')
      .select(
        'contest_id, status, admin_moderation_status, company:companies!tender_bids_company_id_fkey (id, name)',
      )
      .in('contest_id', tenderIds);

    for (const row of bids || []) {
      const tid = row.contest_id as string;
      const status = row.status as string;
      const moderationStatus = row.admin_moderation_status as string | null | undefined;
      if (
        countsTowardContestOfferCount(status) &&
        moderationStatus !== 'suspended'
      ) {
        offerCounts[tid] = (offerCounts[tid] ?? 0) + 1;
      }
      if (status === 'accepted') {
        hasSelected[tid] = true;
        const company = row.company as { id?: string; name?: string } | null;
        if (company?.name) winnerNames[tid] = company.name;
        if (company?.id) winnerCompanyIds[tid] = company.id;
      }
    }
  }

  const [unseenCounts, unansweredCounts, questionCounts, commentCounts] =
    tenderIds.length > 0
      ? await Promise.all([
          fetchUnseenContestQuestionCounts(supabase, tenderIds),
          fetchUnansweredContestQuestionCounts(supabase, tenderIds),
          fetchContestQuestionCounts(supabase, tenderIds),
          fetchContestCommentCounts(supabase, tenderIds),
        ])
      : [{}, {}, {}, {}];

  const reviewedTenderIds =
    managerUserId && tenderIds.length > 0
      ? await fetchReviewedTenderIdsForReviewer(
          supabase,
          managerUserId,
          tenderIds.filter((id) => hasSelected[id]),
        )
      : new Set<string>();

  return contestRows.map((t) => ({
    id: t.id,
    title: t.title,
    locationLabel: formatContestLocationLabel(t),
    submissionDeadline: t.submission_deadline,
    status: t.status,
    offersCount: offerCounts[t.id] ?? 0,
    hasSelectedOffer: hasSelected[t.id] ?? false,
    canEdit: t.status === 'draft',
    selectedContractorName: winnerNames[t.id],
    selectedContractorCompanyId: winnerCompanyIds[t.id],
    createdAt: t.created_at,
    unseenQuestionsCount: unseenCounts[t.id] ?? 0,
    unansweredQuestionsCount: unansweredCounts[t.id] ?? 0,
    questionsCount: questionCounts[t.id] ?? 0,
    commentsCount: commentCounts[t.id] ?? 0,
    hasCooperationReview: reviewedTenderIds.has(t.id),
    renewedFromContestId: t.renewed_from_contest_id ?? null,
  }));
}

export function getContestStatusLabel(status: string): string {
  return getContestWorkflowStatusLabel(status);
}

export async function deleteManagerContestDraft(
  supabase: SupabaseClient<Database>,
  params: {
    tenderId: string;
    managerId: string;
    companyId: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const tenderId = params.tenderId.trim();
  if (!tenderId) {
    return { success: false, error: 'Nieprawidłowe dane' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender, error: fetchErr } = await (supabase as any)
    .from('contests')
    .select('id, status, manager_id, company_id')
    .eq('id', tenderId)
    .maybeSingle();

  if (fetchErr || !tender) {
    return { success: false, error: 'Nie znaleziono konkursu' };
  }

  if (tender.manager_id !== params.managerId || tender.company_id !== params.companyId) {
    return { success: false, error: 'Brak uprawnień' };
  }

  if (tender.status !== 'draft') {
    return { success: false, error: 'Tylko szkic konkursu można odrzucić' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: bidCount, error: countErr } = await (supabase as any)
    .from('contest_offers')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', tenderId)
    .neq('status', 'draft')
    .neq('status', 'cancelled');

  if (countErr) {
    return { success: false, error: countErr.message || 'Nie udało się sprawdzić ofert' };
  }

  if ((bidCount ?? 0) > 0) {
    return { success: false, error: 'Nie można odrzucić szkicu — konkurs ma już złożone oferty' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteErr } = await (supabase as any)
    .from('contests')
    .delete()
    .eq('id', tenderId);

  if (deleteErr) {
    return { success: false, error: deleteErr.message || 'Nie udało się odrzucić szkicu konkursu' };
  }

  return { success: true };
}
