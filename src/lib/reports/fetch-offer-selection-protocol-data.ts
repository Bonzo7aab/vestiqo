import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { fetchTenderBidsByTenderId, fetchTenderById } from '../database/jobs';
import { fetchUserPrimaryCompany } from '../database/companies';
import { computeGrossFromNet, type ContestOfferVatRate } from '../../types/contest-offer';

export interface OfferSelectionProtocolOfferRow {
  contractorCompany: string;
  netPrice: number;
  vatLabel: string;
  grossPrice: number;
  startDate: string;
  durationLabel: string;
  warrantyLabel: string;
  statusLabel: 'Wybrana' | 'Niewybrana';
}

export interface OfferSelectionProtocolData {
  contestId: string;
  contestTitle: string;
  propertyLabel: string;
  awardedAt: string;
  managerName: string;
  managerCompanyName: string;
  selectionJustification: string;
  offers: OfferSelectionProtocolOfferRow[];
}

function formatProtocolDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPropertyLabel(tender: {
  address?: string | null;
  building?: {
    name?: string | null;
    street_address?: string | null;
    city?: string | null;
  } | null;
  company?: { name?: string | null } | null;
}): string {
  const building = tender.building;
  const parts: string[] = [];
  if (building?.name?.trim()) parts.push(building.name.trim());
  if (building?.street_address?.trim()) parts.push(building.street_address.trim());
  if (building?.city?.trim()) parts.push(building.city.trim());
  if (parts.length > 0) return parts.join(', ');
  if (tender.address?.trim()) return tender.address.trim();
  if (tender.company?.name?.trim()) return tender.company.name.trim();
  return '—';
}

function vatLabel(vatRate: ContestOfferVatRate | null | undefined): string {
  if (vatRate === 'zw') return 'ZW';
  if (vatRate === '8') return '8%';
  if (vatRate === '23') return '23%';
  return '23%';
}

function grossFromBid(
  net: number,
  vatRate: ContestOfferVatRate | null | undefined,
  grossPrice: number | null | undefined,
): number {
  if (grossPrice != null && !Number.isNaN(grossPrice)) return grossPrice;
  if (vatRate === 'zw') return net;
  return computeGrossFromNet(net, vatRate ?? '23');
}

export async function fetchOfferSelectionProtocolData(
  supabase: SupabaseClient<Database>,
  contestId: string,
  managerId: string,
  companyId: string,
): Promise<{ data: OfferSelectionProtocolData | null; error?: string; status?: number }> {
  const id = contestId.trim();
  if (!id) {
    return { data: null, error: 'Nieprawidłowy identyfikator konkursu', status: 400 };
  }

  const { data: tender, error: tenderError } = await fetchTenderById(supabase, id);
  if (tenderError || !tender) {
    return { data: null, error: 'Nie znaleziono konkursu', status: 404 };
  }

  const tenderRow = tender as unknown as {
    id: string;
    title: string;
    status?: string | null;
    manager_id: string;
    company_id: string;
    awarded_at?: string | null;
    updated_at?: string | null;
    selection_justification?: string | null;
    address?: string | null;
    building?: {
      name?: string | null;
      street_address?: string | null;
      city?: string | null;
    } | null;
    company?: { name?: string | null } | null;
  };

  if (tenderRow.manager_id !== managerId || tenderRow.company_id !== companyId) {
    return { data: null, error: 'Brak uprawnień', status: 403 };
  }

  if (tenderRow.status !== 'awarded') {
    return { data: null, error: 'Protokół dostępny tylko dla rozstrzygniętych konkursów', status: 403 };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('first_name, last_name')
    .eq('id', managerId)
    .maybeSingle();

  const { data: company } = await fetchUserPrimaryCompany(supabase, managerId);
  const managerName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Zarządca'
    : 'Zarządca';

  const { data: bids, error: bidsError } = await fetchTenderBidsByTenderId(supabase, id, {
    submittedOnly: true,
  });

  if (bidsError || !bids) {
    return { data: null, error: 'Nie udało się wczytać ofert', status: 500 };
  }

  const offers: OfferSelectionProtocolOfferRow[] = bids.map((raw) => {
    const bid = raw as {
      contractorCompany: string;
      netPrice?: number;
      totalPrice?: number;
      vatRate?: ContestOfferVatRate | null;
      grossPrice?: number | null;
      proposedStartDate?: Date | string;
      proposedTimeline?: number;
      warrantyMonths?: number | null;
      guaranteePeriod?: number;
      status?: string;
    };

    const net = bid.netPrice ?? bid.totalPrice ?? 0;
    const vat = bid.vatRate ?? null;
    const gross = grossFromBid(net, vat, bid.grossPrice);
    const days = bid.proposedTimeline ?? 0;
    const durationLabel =
      days > 0 ? `${days} ${days === 1 ? 'dzień' : 'dni'}` : '—';
    const warranty = bid.warrantyMonths ?? bid.guaranteePeriod ?? null;
    const start =
      bid.proposedStartDate instanceof Date
        ? bid.proposedStartDate
        : bid.proposedStartDate
          ? new Date(bid.proposedStartDate)
          : null;

    return {
      contractorCompany: bid.contractorCompany,
      netPrice: net,
      vatLabel: vatLabel(vat),
      grossPrice: gross,
      startDate: start && !Number.isNaN(start.getTime()) ? formatProtocolDate(start.toISOString()) : '—',
      durationLabel,
      warrantyLabel: warranty != null ? `${warranty} mies.` : '—',
      statusLabel: bid.status === 'accepted' ? 'Wybrana' : 'Niewybrana',
    };
  });

  offers.sort((a, b) => {
    if (a.statusLabel === 'Wybrana') return -1;
    if (b.statusLabel === 'Wybrana') return 1;
    return a.contractorCompany.localeCompare(b.contractorCompany, 'pl');
  });

  return {
    data: {
      contestId: id,
      contestTitle: tenderRow.title,
      propertyLabel: formatPropertyLabel(tenderRow),
      awardedAt: formatProtocolDate(tenderRow.awarded_at ?? tenderRow.updated_at),
      managerName,
      managerCompanyName: company?.name?.trim() || tenderRow.company?.name?.trim() || '—',
      selectionJustification: tenderRow.selection_justification?.trim() || '—',
      offers,
    },
  };
}

/** Pre-format money for PDF cells (plain text, no React). */
export function formatProtocolMoney(amount: number): string {
  return formatMoney(amount);
}
