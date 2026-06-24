import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ContestOfferDetails } from '../../types/contest-offer';
import {
  fetchJobApplicationsByJobId,
  fetchTenderBidsByTenderId,
  updateManagerJobWorkflowStatus,
} from './jobs';
import { resolveContestBidPricing } from './contractor-contest-offers';

export const SELECTION_JUSTIFICATION_MIN_LENGTH = 10;
export const SELECTION_JUSTIFICATION_MAX_LENGTH = 1000;

export function validateSelectionJustification(
  value: string,
): { ok: true; trimmed: string } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (trimmed.length < SELECTION_JUSTIFICATION_MIN_LENGTH) {
    return {
      ok: false,
      error: `Uzasadnienie wyboru musi mieć co najmniej ${SELECTION_JUSTIFICATION_MIN_LENGTH} znaków`,
    };
  }
  if (trimmed.length > SELECTION_JUSTIFICATION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Uzasadnienie wyboru może mieć maksymalnie ${SELECTION_JUSTIFICATION_MAX_LENGTH} znaków`,
    };
  }
  return { ok: true, trimmed };
}

export interface AcceptOfferResult {
  success: boolean;
  error?: string;
}

async function verifyJobOwnership(
  supabase: SupabaseClient<Database>,
  jobId: string,
  managerId: string,
  companyId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, manager_id, company_id')
    .eq('id', jobId)
    .maybeSingle();

  if (error || !job) {
    return { ok: false, error: 'Nie znaleziono zgłoszenia' };
  }
  if (job.manager_id !== managerId) {
    return { ok: false, error: 'Brak uprawnień' };
  }
  if (job.company_id !== companyId) {
    return { ok: false, error: 'Zgłoszenie nie należy do tej firmy' };
  }
  return { ok: true };
}

async function verifyTenderOwnership(
  supabase: SupabaseClient<Database>,
  tenderId: string,
  managerId: string,
  companyId: string,
): Promise<{ ok: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender, error } = await (supabase as any)
    .from('contests')
    .select('id, manager_id, company_id')
    .eq('id', tenderId)
    .maybeSingle();

  if (error || !tender) {
    return { ok: false, error: 'Nie znaleziono przetargu' };
  }
  if (tender.manager_id !== managerId) {
    return { ok: false, error: 'Brak uprawnień' };
  }
  if (tender.company_id !== companyId) {
    return { ok: false, error: 'Przetarg nie należy do tej firmy' };
  }
  return { ok: true };
}

/**
 * Manager selects a job offer: accept one application, reject other open ones, move job to in_progress.
 */
export async function acceptManagerJobOffer(
  supabase: SupabaseClient<Database>,
  params: {
    jobId: string;
    applicationId: string;
    managerId: string;
    companyId: string;
  },
): Promise<AcceptOfferResult> {
  const jobId = params.jobId.trim();
  const applicationId = params.applicationId.trim();

  const ownership = await verifyJobOwnership(
    supabase,
    jobId,
    params.managerId,
    params.companyId,
  );
  if (!ownership.ok) {
    return { success: false, error: ownership.error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: application, error: appErr } = await (supabase as any)
    .from('job_applications')
    .select('id, job_id, status')
    .eq('id', applicationId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (appErr || !application) {
    return { success: false, error: 'Nie znaleziono oferty' };
  }

  if (application.status === 'accepted') {
    return { success: true };
  }

  if (application.status === 'rejected' || application.status === 'cancelled') {
    return { success: false, error: 'Tej oferty nie można wybrać' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAccepted } = await (supabase as any)
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (existingAccepted && existingAccepted.id !== applicationId) {
    return { success: false, error: 'To zgłoszenie ma już wybraną ofertę' };
  }

  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: acceptErr } = await (supabase as any)
    .from('job_applications')
    .update({
      status: 'accepted',
      reviewed_at: now,
      decision_at: now,
    })
    .eq('id', applicationId)
    .eq('job_id', jobId);

  if (acceptErr) {
    return {
      success: false,
      error: acceptErr.message || 'Nie udało się zaakceptować oferty',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rejectErr } = await (supabase as any)
    .from('job_applications')
    .update({
      status: 'rejected',
      reviewed_at: now,
      decision_at: now,
    })
    .eq('job_id', jobId)
    .neq('id', applicationId)
    .in('status', ['submitted', 'under_review', 'shortlisted']);

  if (rejectErr) {
    console.error('acceptManagerJobOffer: reject others', rejectErr);
  }

  const { error: statusErr } = await updateManagerJobWorkflowStatus(supabase, {
    jobId,
    managerId: params.managerId,
    companyId: params.companyId,
    status: 'in_progress',
  });

  if (statusErr) {
    const message =
      statusErr instanceof Error
        ? statusErr.message
        : (statusErr as PostgrestError).message || 'Nie udało się zaktualizować statusu zgłoszenia';
    return { success: false, error: message };
  }

  return { success: true };
}

/**
 * Manager selects a tender bid: accept one bid, reject other open ones, mark tender awarded.
 */
export async function acceptManagerTenderOffer(
  supabase: SupabaseClient<Database>,
  params: {
    tenderId: string;
    bidId: string;
    managerId: string;
    companyId: string;
    selectionJustification?: string;
  },
): Promise<AcceptOfferResult> {
  const tenderId = params.tenderId.trim();
  const bidId = params.bidId.trim();

  let selectionJustification: string | null = null;
  if (params.selectionJustification != null) {
    const validation = validateSelectionJustification(params.selectionJustification);
    if (validation.ok === false) {
      return { success: false, error: validation.error };
    }
    selectionJustification = validation.trimmed;
  }

  const ownership = await verifyTenderOwnership(
    supabase,
    tenderId,
    params.managerId,
    params.companyId,
  );
  if (!ownership.ok) {
    return { success: false, error: ownership.error };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bid, error: bidErr } = await (supabase as any)
    .from('contest_offers')
    .select('id, contest_id, status')
    .eq('id', bidId)
    .eq('contest_id', tenderId)
    .maybeSingle();

  if (bidErr || !bid) {
    return { success: false, error: 'Nie znaleziono oferty' };
  }

  if (bid.status === 'accepted') {
    return { success: true };
  }

  if (bid.status === 'rejected' || bid.status === 'cancelled') {
    return { success: false, error: 'Tej oferty nie można wybrać' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingAccepted } = await (supabase as any)
    .from('contest_offers')
    .select('id')
    .eq('contest_id', tenderId)
    .eq('status', 'accepted')
    .maybeSingle();

  if (existingAccepted && existingAccepted.id !== bidId) {
    return { success: false, error: 'Ten przetarg ma już wybraną ofertę' };
  }

  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: acceptErr } = await (supabase as any)
    .from('contest_offers')
    .update({
      status: 'accepted',
      evaluated_at: now,
    })
    .eq('id', bidId)
    .eq('contest_id', tenderId);

  if (acceptErr) {
    return {
      success: false,
      error: acceptErr.message || 'Nie udało się zaakceptować oferty',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: rejectErr } = await (supabase as any)
    .from('contest_offers')
    .update({
      status: 'rejected',
      evaluated_at: now,
    })
    .eq('contest_id', tenderId)
    .neq('id', bidId)
    .in('status', ['submitted', 'under_review', 'shortlisted']);

  if (rejectErr) {
    console.error('acceptManagerTenderOffer: reject others', rejectErr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tenderErr } = await (supabase as any)
    .from('contests')
    .update({
      status: 'awarded',
      updated_at: now,
      awarded_at: now,
      ...(selectionJustification != null
        ? { selection_justification: selectionJustification }
        : {}),
    })
    .eq('id', tenderId)
    .eq('manager_id', params.managerId);

  if (tenderErr) {
    return {
      success: false,
      error: tenderErr.message || 'Nie udało się zaktualizować statusu przetargu',
    };
  }

  const orderResult = await createOrderFromContestWinner(supabase, {
    tenderId,
    bidId,
    managerId: params.managerId,
    companyId: params.companyId,
  });

  if (!orderResult.success) {
    console.error('createOrderFromContestWinner:', orderResult.error);
  }

  return { success: true };
}

function formatTenderLocationLabel(tender: {
  address?: string | null;
  managed_entity?: {
    name?: string | null;
    address?: string | null;
    city?: string | null;
  } | null;
}): string {
  const entity = tender.managed_entity;
  if (entity?.address || entity?.city) {
    const parts = [entity.address, entity.city].filter(Boolean);
    return parts.join(', ');
  }
  if (tender.address?.trim()) return tender.address.trim();
  if (entity?.name?.trim()) return entity.name.trim();
  return '—';
}

/** OPD-63: creates Zamówienie when manager selects contest winner. */
export async function createOrderFromContestWinner(
  supabase: SupabaseClient<Database>,
  params: {
    tenderId: string;
    bidId: string;
    managerId: string;
    companyId: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const tenderId = params.tenderId.trim();
  const bidId = params.bidId.trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingOrder } = await (supabase as any)
    .from('orders')
    .select('id')
    .eq('contest_id', tenderId)
    .maybeSingle();

  if (existingOrder?.id) {
    return { success: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tender, error: tenderErr } = await (supabase as any)
    .from('contests')
    .select(
      `
      id,
      title,
      completion_date,
      address,
      manager_id,
      company_id,
      managed_entity:managed_housing_entities!contests_managed_entity_id_fkey (
        name,
        address,
        city,
        entity_type,
        nip
      )
    `,
    )
    .eq('id', tenderId)
    .maybeSingle();

  if (tenderErr || !tender) {
    return { success: false, error: 'Nie znaleziono konkursu' };
  }

  if (tender.manager_id !== params.managerId || tender.company_id !== params.companyId) {
    return { success: false, error: 'Brak uprawnień' };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: bid, error: bidErr } = await (supabase as any)
    .from('contest_offers')
    .select(
      `
      id,
      contest_id,
      contractor_id,
      company_id,
      bid_amount,
      offer_details,
      currency,
      status,
      company:companies!tender_bids_company_id_fkey ( name )
    `,
    )
    .eq('id', bidId)
    .eq('contest_id', tenderId)
    .maybeSingle();

  if (bidErr || !bid) {
    return { success: false, error: 'Nie znaleziono oferty' };
  }

  if (bid.status !== 'accepted') {
    return { success: false, error: 'Oferta nie jest zaakceptowana' };
  }

  const offerDetails = bid.offer_details as ContestOfferDetails | null | undefined;
  const pricing = resolveContestBidPricing(offerDetails ?? null, bid.bid_amount);
  const now = new Date().toISOString();
  const winnerName =
    (bid.company as { name?: string } | null)?.name?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (supabase as any).from('orders').insert({
    contest_id: tenderId,
    contest_offer_id: bidId,
    manager_id: params.managerId,
    manager_company_id: params.companyId,
    contractor_id: bid.contractor_id,
    contractor_company_id: bid.company_id,
    status: 'in_progress',
    title: tender.title || 'Zamówienie',
    location_label: formatTenderLocationLabel(tender),
    completion_deadline: tender.completion_date ?? null,
    net_amount: pricing.netPrice,
    gross_amount: pricing.grossPrice,
    vat_rate: pricing.vatRate,
    currency: bid.currency || 'PLN',
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    if (insertErr.code === '23505') {
      return { success: true };
    }
    return {
      success: false,
      error: insertErr.message || 'Nie udało się utworzyć zamówienia',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('contests')
    .update({
      winning_offer_id: bidId,
      winner_name: winnerName,
      updated_at: now,
    })
    .eq('id', tenderId);

  return { success: true };
}

/** Load accepted job application for manager "Wybrana Oferta" tab. */
export async function fetchAcceptedJobApplication(
  supabase: SupabaseClient<Database>,
  jobId: string,
) {
  const { data: apps } = await fetchJobApplicationsByJobId(supabase, jobId);
  return (apps || []).find((a) => a.status === 'accepted') ?? null;
}

/** Load accepted tender bid for manager "Wybrana Oferta" tab. */
export async function fetchAcceptedTenderBid(
  supabase: SupabaseClient<Database>,
  tenderId: string,
) {
  const { data: bids } = await fetchTenderBidsByTenderId(supabase, tenderId);
  const accepted = (bids || []).find(
    (b) => String((b as { status?: string }).status) === 'accepted',
  );
  return accepted ?? null;
}

export interface AcceptedContractorForTender {
  companyId: string;
  companyName: string;
}

/** Accepted contractor company for a contest with a selected offer. */
export async function fetchAcceptedContractorCompanyForTender(
  supabase: SupabaseClient<Database>,
  tenderId: string,
): Promise<AcceptedContractorForTender | null> {
  const bid = await fetchAcceptedTenderBid(supabase, tenderId);
  if (!bid) return null;

  const row = bid as {
    contractorCompanyId?: string;
    contractorCompany?: string;
  };

  const companyId = row.contractorCompanyId?.trim() ?? '';
  const companyName = row.contractorCompany?.trim() ?? '';
  if (!companyId || !companyName) return null;

  return { companyId, companyName };
}
