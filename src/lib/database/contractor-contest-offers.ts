import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import {
  deriveContractorContestOfferStatus,
  type ContractorContestOfferStatus,
} from '../contest-offer/contractor-contest-offer-status';
import { fetchUserPrimaryCompany } from './companies';
import { fetchReviewedTenderIdsForReviewer } from './reviews';
import { isContestTender } from '../contest/map-tender-contest-display';
import {
  computeGrossFromNet,
  type ContestOfferDetails,
  type ContestOfferVatRate,
} from '../../types/contest-offer';

export interface ContractorContestOfferRow {
  id: string;
  tenderId: string;
  contestTitle: string;
  organizerName: string;
  organizerCompanyId: string;
  netPrice: number;
  grossPrice: number;
  vatRate: ContestOfferVatRate;
  vatLabel: string;
  submissionDeadline: string;
  derivedStatus: ContractorContestOfferStatus;
  bidStatus: string;
  tenderStatus: string;
  submittedAt: string;
  hasCooperationReview: boolean;
}

function parseOfferDetails(raw: unknown): ContestOfferDetails | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as ContestOfferDetails;
}

export function resolveContestBidPricing(
  offerDetails: ContestOfferDetails | null,
  bidAmount: string | number | null | undefined,
): { netPrice: number; grossPrice: number; vatRate: ContestOfferVatRate; vatLabel: string } {
  const vatRate: ContestOfferVatRate =
    offerDetails?.vatRate === '8' || offerDetails?.vatRate === '23' || offerDetails?.vatRate === 'zw'
      ? offerDetails.vatRate
      : '23';

  let netPrice =
    offerDetails?.netPrice != null && !Number.isNaN(offerDetails.netPrice)
      ? offerDetails.netPrice
      : null;

  if (netPrice == null && bidAmount != null) {
    const parsed = typeof bidAmount === 'string' ? Number.parseFloat(bidAmount) : Number(bidAmount);
    if (!Number.isNaN(parsed)) netPrice = parsed;
  }

  if (netPrice == null) netPrice = 0;

  const grossPrice =
    offerDetails?.grossPrice != null && !Number.isNaN(offerDetails.grossPrice)
      ? offerDetails.grossPrice
      : computeGrossFromNet(netPrice, vatRate);

  const vatLabel =
    vatRate === 'zw' ? 'ZW' : vatRate === '8' ? '8% VAT' : '23% VAT';

  return { netPrice, grossPrice, vatRate, vatLabel };
}

interface BidWithContestTender {
  id: string;
  contest_id: string;
  bid_amount?: string | number | null;
  offer_details?: unknown;
  status: string;
  submitted_at: string;
  contests?: {
    title?: string;
    status?: string;
    submission_deadline?: string;
    managed_entity_id?: string | null;
    selection_criteria?: unknown;
    formal_requirements?: unknown;
    companies?: { id?: string; name?: string } | null;
  } | null;
}

/**
 * OPD-62: Contest-only offers for contractor Moje Oferty (Konkursy tab).
 */
export async function fetchContractorContestOffers(
  supabase: SupabaseClient<Database>,
  contractorUserId: string,
): Promise<ContractorContestOfferRow[]> {
  const { data: company, error: companyError } = await fetchUserPrimaryCompany(
    supabase,
    contractorUserId,
  );
  if (companyError || !company) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bids, error } = await (supabase as any)
    .from('contest_offers')
    .select(
      `
      id,
      contest_id,
      bid_amount,
      offer_details,
      status,
      submitted_at,
      contests (
        title,
        status,
        submission_deadline,
        managed_entity_id,
        selection_criteria,
        formal_requirements,
        companies (
          id,
          name
        )
      )
    `,
    )
    .eq('company_id', company.id)
    .neq('admin_moderation_status', 'suspended')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('fetchContractorContestOffers:', error);
    throw error;
  }

  const rows: ContractorContestOfferRow[] = [];

  for (const bid of (bids || []) as BidWithContestTender[]) {
    const tender = bid.contests;
    if (!tender) continue;

    const isContest = isContestTender({
      managed_entity_id: tender.managed_entity_id ?? null,
      selection_criteria: tender.selection_criteria as Record<string, unknown> | null,
      formal_requirements: tender.formal_requirements as Record<string, unknown> | null,
    });

    if (!isContest) continue;

    const submissionDeadline = tender.submission_deadline ?? '';
    const bidStatus = bid.status || 'submitted';
    const tenderStatus = tender.status || 'active';

    const derivedStatus = deriveContractorContestOfferStatus({
      bidStatus,
      tenderStatus,
      submissionDeadlineIso: submissionDeadline,
    });

    const offerDetails = parseOfferDetails(bid.offer_details);
    const pricing = resolveContestBidPricing(offerDetails, bid.bid_amount);

    rows.push({
      id: bid.id,
      tenderId: bid.contest_id,
      contestTitle: tender.title || 'Bez tytułu',
      organizerName: tender.companies?.name || 'Nieznany organizator',
      organizerCompanyId: tender.companies?.id || '',
      netPrice: pricing.netPrice,
      grossPrice: pricing.grossPrice,
      vatRate: pricing.vatRate,
      vatLabel: pricing.vatLabel,
      submissionDeadline,
      derivedStatus,
      bidStatus,
      tenderStatus,
      submittedAt: bid.submitted_at,
      hasCooperationReview: false,
    });
  }

  const selectedTenderIds = rows
    .filter((row) => row.derivedStatus === 'selected')
    .map((row) => row.tenderId);
  const reviewedTenderIds = await fetchReviewedTenderIdsForReviewer(
    supabase,
    contractorUserId,
    selectedTenderIds,
  );

  for (const row of rows) {
    row.hasCooperationReview = reviewedTenderIds.has(row.tenderId);
  }

  return rows;
}
