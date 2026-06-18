'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Lock, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import {
  fetchJobApplicationsByJobId,
  fetchJobById,
  fetchTenderBidsByTenderId,
  fetchTenderById,
} from '../../lib/database/jobs';
import { fetchContractorById } from '../../lib/database/contractors';
import type { Application } from '../../types/application';
import type { ContractorProfile } from '../../types/contractor';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  acceptJobOfferAction,
  acceptTenderOfferAction,
} from '../../app/panel-zarzadcy/zgloszenia/actions';
import { acceptTenderOfferAction as acceptContestOfferAction } from '../../app/panel-zarzadcy/konkursy/actions';
import type { ContestOfferDetails } from '../../types/contest-offer';
import { computeGrossFromNet } from '../../types/contest-offer';
import type { ContestOfferVatRate } from '../../types/contest-offer';
import { isContestCompareReadOnly } from '../../lib/tender-workflow-status';
import { formatContestLocationLabel } from '../../lib/database/manager-contests';
import type { JobLocation } from '../../lib/database/jobs';
import { formatCompareLockedTooltip } from '../../lib/contest-submission-deadline';
import { ContestOfferDetailView } from './ContestOfferDetailView';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';

function grossFromVat(net: number, vatPercent: number): number {
  return Math.round(net * (1 + vatPercent / 100));
}

function jobDurationLabel(app: Application): string {
  if (app.timelineDays != null && !Number.isNaN(app.timelineDays)) {
    const d = app.timelineDays;
    return `${d} ${d === 1 ? 'dzień roboczy' : 'dni roboczych'}`;
  }
  return app.proposedTimeline;
}

/** Tender bids do not store per-bid VAT in this flow; assume 23% for comparison. */
const DEFAULT_VAT = 23;

type CompareKind = 'job' | 'contest';

interface TenderBidLike {
  id: string;
  contractorCompanyId?: string;
  contractorCompany: string;
  contractorRating: number;
  contractorReviewsCount?: number;
  contractorCompletedJobs: number;
  totalPrice: number;
  netPrice?: number;
  vatRate?: ContestOfferVatRate | null;
  grossPrice?: number | null;
  warrantyMonths?: number | null;
  proposedTimeline: number;
  proposedStartDate: Date;
  guaranteePeriod: number;
  technicalProposal: string;
  offerDetails?: ContestOfferDetails | Record<string, unknown> | null;
  attachments: Array<Record<string, unknown>>;
  status?: string;
}

function netFromBid(bid: TenderBidLike): number {
  return bid.netPrice ?? bid.totalPrice;
}

function vatLabelFromBid(bid: TenderBidLike): string {
  if (bid.vatRate === 'zw') return 'ZW';
  if (bid.vatRate === '8') return '8%';
  if (bid.vatRate === '23') return '23%';
  return '23%';
}

function bruttoFromBid(bid: TenderBidLike): number {
  if (bid.grossPrice != null && !Number.isNaN(bid.grossPrice)) {
    return bid.grossPrice;
  }
  const net = netFromBid(bid);
  const rate = bid.vatRate ?? '23';
  if (rate === 'zw') return net;
  return computeGrossFromNet(net, rate);
}

interface ManagerOfferCompareClientProps {
  submissionId: string;
  kind: CompareKind;
  contestMode?: boolean;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatJobLocationLabel(job: {
  address?: string | null;
  location: JobLocation | string;
}): string {
  if (job.address?.trim()) return job.address.trim();
  const loc = job.location;
  if (typeof loc === 'string' && loc.trim()) return loc.trim();
  if (loc && typeof loc === 'object') {
    const parts = [loc.city, loc.sublocality_level_1].filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return '—';
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type CompareSortKey =
  | 'contractor'
  | 'net'
  | 'brutto'
  | 'start'
  | 'duration'
  | 'guarantee'
  | 'rating';

interface CompareSortState {
  key: CompareSortKey;
  dir: 'asc' | 'desc';
}

function parseGuaranteeMonths(value: string | number): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const m = /^(\d+)/.exec(String(value).trim());
  return m ? parseInt(m[1], 10) : 0;
}

interface SortableThProps {
  label: string;
  sortKey: CompareSortKey;
  sort: CompareSortState;
  onSort: (key: CompareSortKey) => void;
}

function SortableTh({ label, sortKey, sort, onSort }: SortableThProps): React.ReactElement {
  const active = sort.key === sortKey;
  return (
    <TableHead>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? (
          sort.dir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export function ManagerOfferCompareClient({
  submissionId,
  kind,
  contestMode = false,
}: ManagerOfferCompareClientProps): React.ReactElement {
  const router = useRouter();
  const [title, setTitle] = useState<string>('');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [tenderStatus, setTenderStatus] = useState<string | null>(null);
  const [submissionDeadline, setSubmissionDeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobApps, setJobApps] = useState<Application[]>([]);
  const [tenderBids, setTenderBids] = useState<TenderBidLike[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ContractorProfile | null>>({});
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [detailBid, setDetailBid] = useState<TenderBidLike | null>(null);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [confirmSelectOpen, setConfirmSelectOpen] = useState(false);
  const [pendingSelectBid, setPendingSelectBid] = useState<TenderBidLike | null>(null);
  const [selectingOffer, setSelectingOffer] = useState(false);

  const [sort, setSort] = useState<CompareSortState>({ key: 'net', dir: 'asc' });

  const toggleSort = (key: CompareSortKey): void => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  };

  const sortedJobApps = useMemo(() => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    const rows = [...jobApps];
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case 'contractor':
          cmp = a.contractorCompany.localeCompare(b.contractorCompany, 'pl');
          break;
        case 'net':
          cmp = a.proposedPrice - b.proposedPrice;
          break;
        case 'brutto':
          cmp =
            grossFromVat(a.proposedPrice, a.vatRate ?? 23) -
            grossFromVat(b.proposedPrice, b.vatRate ?? 23);
          break;
        case 'start':
          cmp = new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime();
          break;
        case 'duration': {
          const da = a.timelineDays ?? Number.MAX_SAFE_INTEGER;
          const db = b.timelineDays ?? Number.MAX_SAFE_INTEGER;
          cmp = da - db;
          break;
        }
        case 'guarantee':
          cmp = parseGuaranteeMonths(a.guaranteePeriod) - parseGuaranteeMonths(b.guaranteePeriod);
          break;
        case 'rating':
          cmp = a.contractorRating - b.contractorRating;
          break;
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp * mul;
      return a.contractorCompany.localeCompare(b.contractorCompany, 'pl');
    });
    return rows;
  }, [jobApps, sort]);

  const sortedTenderBids = useMemo(() => {
    const mul = sort.dir === 'asc' ? 1 : -1;
    const rows = [...tenderBids];
    rows.sort((a, b) => {
      let cmp = 0;
      const netA = netFromBid(a);
      const netB = netFromBid(b);
      switch (sort.key) {
        case 'contractor':
          cmp = a.contractorCompany.localeCompare(b.contractorCompany, 'pl');
          break;
        case 'net':
          cmp = netA - netB;
          break;
        case 'brutto':
          cmp = bruttoFromBid(a) - bruttoFromBid(b);
          break;
        case 'start':
          cmp =
            new Date(a.proposedStartDate).getTime() - new Date(b.proposedStartDate).getTime();
          break;
        case 'duration':
          cmp = a.proposedTimeline - b.proposedTimeline;
          break;
        case 'guarantee':
          cmp = a.guaranteePeriod - b.guaranteePeriod;
          break;
        case 'rating':
          cmp = a.contractorRating - b.contractorRating;
          break;
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp * mul;
      return a.contractorCompany.localeCompare(b.contractorCompany, 'pl');
    });
    return rows;
  }, [tenderBids, sort]);

  const loadProfiles = useCallback(async (companyIds: string[]): Promise<void> => {
    const unique = [...new Set(companyIds.filter(Boolean))];
    const entries = await Promise.all(
      unique.map(async (id) => {
        const p = await fetchContractorById(id);
        return [id, p] as const;
      }),
    );
    const map: Record<string, ContractorProfile | null> = {};
    for (const [id, p] of entries) {
      map[id] = p;
    }
    setProfiles(map);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      setLoading(true);
      const supabase = createClient();

      try {
        if (kind === 'job') {
          const [{ data: job, error: jobErr }, { data: apps, error: appErr }] = await Promise.all([
            fetchJobById(supabase, submissionId),
            fetchJobApplicationsByJobId(supabase, submissionId),
          ]);
          if (cancelled) return;
          if (jobErr || !job) {
            toast.error('Nie udało się wczytać zgłoszenia');
            setTitle('');
            setLocationLabel('');
            setJobApps([]);
          } else {
            setTitle(job.title);
            setLocationLabel(formatJobLocationLabel(job));
            setJobApps(apps || []);
            await loadProfiles((apps || []).map((a) => a.contractorCompanyId || ''));
          }
          if (appErr) {
            toast.error('Nie udało się wczytać ofert');
          }
        } else {
          const [{ data: tender, error: tErr }, { data: bids, error: bErr }] = await Promise.all([
            fetchTenderById(supabase, submissionId),
            fetchTenderBidsByTenderId(supabase, submissionId, {
              submittedOnly: contestMode,
            }),
          ]);
          if (cancelled) return;
          if (tErr || !tender) {
            toast.error('Nie udało się wczytać przetargu');
            setTitle('');
            setLocationLabel('');
            setTenderBids([]);
            setTenderStatus(null);
          } else {
            setTitle(tender.title);
            setLocationLabel(formatContestLocationLabel(tender));
            setTenderStatus(tender.status);
            setSubmissionDeadline(tender.submission_deadline ?? null);
            if (contestMode && tender.status === 'active') {
              toast.error('Porównanie ofert będzie dostępne po zakończeniu zbierania ofert');
              router.replace('/panel-zarzadcy/konkursy');
              return;
            }
            const normalized = (bids || []) as unknown as TenderBidLike[];
            setTenderBids(normalized);
            await loadProfiles(normalized.map((b) => b.contractorCompanyId || ''));
          }
          if (bErr) {
            toast.error('Nie udało się wczytać ofert');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [kind, submissionId, loadProfiles, contestMode, router]);

  const backHref = contestMode ? '/panel-zarzadcy/konkursy' : '/panel-zarzadcy/zgloszenia';
  const compareReadOnly =
    contestMode && tenderStatus != null && isContestCompareReadOnly(tenderStatus);
  const canSelectWinner =
    contestMode && tenderStatus === 'evaluation' && !compareReadOnly;

  const profileForCompany = (id: string | undefined): ContractorProfile | null => {
    if (!id) return null;
    return profiles[id] ?? null;
  };

  const ocSummary = (p: ContractorProfile | null): string => {
    if (!p?.insurance) return '❌ Brak OC';
    if (!p.insurance.hasOC) return '❌ Brak OC';
    const sum = p.insurance.ocAmount || '—';
    return `✅ OC: ${sum}`;
  };

  const openDetailFromApp = (app: Application): void => {
    setDetailApp(app);
    setDetailBid(null);
    setShowContactDetails(false);
  };

  const openDetailFromBid = (bid: TenderBidLike): void => {
    setDetailBid(bid);
    setDetailApp(null);
    setShowContactDetails(false);
  };

  const openConfirmSelect = (): void => {
    setConfirmSelectOpen(true);
  };

  const openConfirmSelectBid = (bid: TenderBidLike): void => {
    setPendingSelectBid(bid);
    setConfirmSelectOpen(true);
  };

  const submissionRedirectUrl = (): string => {
    if (contestMode) {
      return `/panel-zarzadcy/konkursy?podglad=${submissionId}&tab=selected-offer`;
    }
    const typ = kind === 'contest' ? 'przetarg' : 'zgłoszenie';
    return `/panel-zarzadcy/zgloszenia?podglad=${submissionId}&typ=${encodeURIComponent(typ)}&tab=selected-offer`;
  };

  const handleConfirmSelectOffer = async (): Promise<void> => {
    if (selectingOffer) return;
    setSelectingOffer(true);

    try {
      if (kind === 'job' && detailApp) {
        const result = await acceptJobOfferAction(submissionId, detailApp.id);
        if (!result.success) {
          toast.error(result.error || 'Nie udało się wybrać oferty');
          return;
        }
      } else if (kind === 'contest') {
        const bidToSelect = pendingSelectBid ?? detailBid;
        if (!bidToSelect) {
          toast.error('Brak wybranej oferty');
          return;
        }
        const result = contestMode
          ? await acceptContestOfferAction(submissionId, bidToSelect.id)
          : await acceptTenderOfferAction(submissionId, bidToSelect.id);
        if (!result.success) {
          toast.error(result.error || 'Nie udało się wybrać oferty');
          return;
        }
      } else {
        toast.error('Brak wybranej oferty');
        return;
      }

      setConfirmSelectOpen(false);
      setPendingSelectBid(null);
      setDetailApp(null);
      setDetailBid(null);
      toast.success('Oferta została wybrana');
      router.refresh();
      router.push(submissionRedirectUrl());
    } catch {
      toast.error('Wystąpił błąd podczas wyboru oferty');
    } finally {
      setSelectingOffer(false);
    }
  };

  const detailProfile = useMemo(() => {
    const id = detailApp?.contractorCompanyId || detailBid?.contractorCompanyId;
    if (!id) return null;
    return profiles[id] ?? null;
  }, [detailApp, detailBid, profiles]);

  const isSelectedOffer =
    detailApp?.status === 'accepted' || detailBid?.status === 'accepted';

  const showSelectInDetail =
    (kind === 'job' || !compareReadOnly) &&
    (kind !== 'contest' || canSelectWinner || !contestMode) &&
    !(contestMode && detailBid);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
        Ładowanie porównania…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Porównanie ofert</h1>
          <Button variant="outline" onClick={() => router.push(backHref)} className="gap-2 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            {contestMode ? 'Powrót do konkursów' : 'Powrót do listy zgłoszeń'}
          </Button>
        </div>
        <div>
          <p className="text-muted-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Lokalizacja: {locationLabel || '—'}
          </p>
        </div>
      </div>

      {contestMode && tenderStatus === 'active' ? (
        <Card>
          <CardContent className="pt-6 flex items-start gap-3 text-muted-foreground">
            <Lock className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
            <p>{formatCompareLockedTooltip(submissionDeadline)}</p>
          </CardContent>
        </Card>
      ) : null}

      {kind === 'job' ? (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Wykonawca" sortKey="contractor" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Cena netto" sortKey="net" sort={sort} onSort={toggleSort} />
                  <TableHead>VAT</TableHead>
                  <SortableTh label="Cena brutto" sortKey="brutto" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Termin rozpoczęcia" sortKey="start" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Czas realizacji" sortKey="duration" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Okres gwarancji" sortKey="guarantee" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Ocena wykonawcy" sortKey="rating" sort={sort} onSort={toggleSort} />
                  <TableHead className="text-right">Szczegóły</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobApps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      Brak ofert do porównania.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJobApps.map((app) => {
                    const net = app.proposedPrice;
                    const vatRate = app.vatRate ?? 23;
                    const brutto = grossFromVat(net, vatRate);
                    const p = profileForCompany(app.contractorCompanyId);
                    const stars = `⭐ ${app.contractorRating.toFixed(1)}`;
                    const durationLabel = jobDurationLabel(app);
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.contractorCompany}</TableCell>
                        <TableCell>{formatMoney(net)}</TableCell>
                        <TableCell>{vatRate}%</TableCell>
                        <TableCell className="font-semibold">{formatMoney(brutto)}</TableCell>
                        <TableCell>{formatDate(app.availableFrom)}</TableCell>
                        <TableCell>{durationLabel}</TableCell>
                        <TableCell>{app.guaranteePeriod}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {ocSummary(p)} / {stars}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetailFromApp(app)}>
                            Szczegóły
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : contestMode ? (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Wykonawca" sortKey="contractor" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Cena netto" sortKey="net" sort={sort} onSort={toggleSort} />
                  <TableHead>VAT</TableHead>
                  <SortableTh label="Cena brutto" sortKey="brutto" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Termin rozpoczęcia" sortKey="start" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Czas realizacji" sortKey="duration" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Gwarancja" sortKey="guarantee" sort={sort} onSort={toggleSort} />
                  <TableHead className="text-right">Akcja</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenderBids.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      Brak złożonych ofert do porównania.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTenderBids.map((bid) => {
                    const net = netFromBid(bid);
                    const brutto = bruttoFromBid(bid);
                    const warranty =
                      bid.warrantyMonths ?? bid.guaranteePeriod ?? null;
                    const reviews = bid.contractorReviewsCount ?? 0;
                    const days = bid.proposedTimeline;
                    const durationLabel =
                      days != null && days > 0
                        ? `${days} ${days === 1 ? 'dzień' : 'dni'}`
                        : '—';
                    const isWinner = bid.status === 'accepted';
                    return (
                      <TableRow key={bid.id} className={isWinner ? 'bg-primary/5' : undefined}>
                        <TableCell>
                          <div className="font-medium">{bid.contractorCompany}</div>
                          <div className="text-xs text-muted-foreground">
                            ⭐ {bid.contractorRating.toFixed(1)}
                            {reviews > 0 ? ` (${reviews} ${reviews === 1 ? 'ocena' : 'ocen'})` : ''}
                          </div>
                        </TableCell>
                        <TableCell>{formatMoney(net)}</TableCell>
                        <TableCell>{vatLabelFromBid(bid)}</TableCell>
                        <TableCell className="font-semibold">{formatMoney(brutto)}</TableCell>
                        <TableCell>{formatDate(bid.proposedStartDate)}</TableCell>
                        <TableCell>{durationLabel}</TableCell>
                        <TableCell>
                          {warranty != null ? `${warranty} msc` : '—'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openDetailFromBid(bid)}>
                            Szczegóły
                          </Button>
                          {canSelectWinner && !isWinner ? (
                            <Button size="sm" onClick={() => openConfirmSelectBid(bid)}>
                              Wybierz ofertę
                            </Button>
                          ) : null}
                          {isWinner ? (
                            <span className="text-xs font-medium text-primary">Wybrana</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTh label="Wykonawca" sortKey="contractor" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Cena netto" sortKey="net" sort={sort} onSort={toggleSort} />
                  <TableHead>VAT</TableHead>
                  <SortableTh label="Cena brutto" sortKey="brutto" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Termin rozpoczęcia" sortKey="start" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Czas realizacji" sortKey="duration" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Okres gwarancji" sortKey="guarantee" sort={sort} onSort={toggleSort} />
                  <SortableTh label="Ocena wykonawcy" sortKey="rating" sort={sort} onSort={toggleSort} />
                  <TableHead className="text-right">Szczegóły</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenderBids.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                      Brak ofert do porównania.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTenderBids.map((bid) => {
                    const net = netFromBid(bid);
                    const brutto = grossFromVat(net, DEFAULT_VAT);
                    const p = profileForCompany(bid.contractorCompanyId);
                    const days = bid.proposedTimeline;
                    const durationLabel = `${days} ${days === 1 ? 'dzień' : 'dni'}`;
                    const stars = `⭐ ${bid.contractorRating.toFixed(1)}`;
                    return (
                      <TableRow key={bid.id}>
                        <TableCell className="font-medium">{bid.contractorCompany}</TableCell>
                        <TableCell>{formatMoney(net)}</TableCell>
                        <TableCell>{DEFAULT_VAT}%</TableCell>
                        <TableCell className="font-semibold">{formatMoney(brutto)}</TableCell>
                        <TableCell>{formatDate(bid.proposedStartDate)}</TableCell>
                        <TableCell>{durationLabel}</TableCell>
                        <TableCell>{bid.guaranteePeriod} m-cy</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {ocSummary(p)} / {stars}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetailFromBid(bid)}>
                            Szczegóły
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!detailApp || !!detailBid}
        onOpenChange={(o) => {
          if (!o) {
            setDetailApp(null);
            setDetailBid(null);
            setShowContactDetails(false);
          }
        }}
      >
        <DialogContent
          className={
            contestMode && detailBid
              ? 'max-w-2xl max-h-[90vh] overflow-y-auto gap-0 p-0'
              : 'max-w-lg max-h-[90vh] overflow-y-auto'
          }
        >
          <DialogHeader className={contestMode && detailBid ? 'px-6 pt-6 pb-0' : undefined}>
            <DialogTitle>
              {contestMode && detailBid ? 'Szczegóły oferty' : `Szczegóły oferty: ${detailApp?.contractorCompany || detailBid?.contractorCompany}`}
            </DialogTitle>
            <DialogDescription>
              {contestMode && detailBid
                ? 'Pełna treść oferty złożonej przez wykonawcę'
                : 'Podsumowanie finansowe i dane wykonawcy'}
            </DialogDescription>
          </DialogHeader>
          {(detailApp || detailBid) && (
            <div className={cn('space-y-4 text-sm', contestMode && detailBid && 'px-6 pb-6 pt-4')}>
              {contestMode && detailBid ? (
                <ContestOfferDetailView
                  bid={detailBid}
                  formatMoney={formatMoney}
                  formatDate={formatDate}
                  netFromBid={netFromBid}
                  bruttoFromBid={bruttoFromBid}
                  vatLabelFromBid={vatLabelFromBid}
                />
              ) : (
                <>
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Podsumowanie</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  {detailApp && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Kwota netto: </span>
                        <strong>{formatMoney(detailApp.proposedPrice)}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">VAT: </span>
                        {(detailApp.vatRate ?? 23)}% (
                        {formatMoney(
                          grossFromVat(detailApp.proposedPrice, detailApp.vatRate ?? 23) - detailApp.proposedPrice
                        )}
                        )
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kwota brutto: </span>
                        <strong>{formatMoney(grossFromVat(detailApp.proposedPrice, detailApp.vatRate ?? 23))}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Termin rozpoczęcia: </span>
                        {formatDate(detailApp.availableFrom)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Czas realizacji: </span>
                        {jobDurationLabel(detailApp)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gwarancja: </span>
                        {detailApp.guaranteePeriod}
                      </div>
                    </>
                  )}
                  {detailBid && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Kwota netto: </span>
                        <strong>{formatMoney(netFromBid(detailBid))}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">VAT: </span>
                        {vatLabelFromBid(detailBid)} (
                        {formatMoney(bruttoFromBid(detailBid) - netFromBid(detailBid))}
                        )
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kwota brutto: </span>
                        <strong>{formatMoney(bruttoFromBid(detailBid))}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Termin rozpoczęcia: </span>
                        {formatDate(detailBid.proposedStartDate)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Czas realizacji: </span>
                        {detailBid.proposedTimeline} dni
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gwarancja: </span>
                        {detailBid.guaranteePeriod} mies.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div>
                <h4 className="font-semibold mb-1">Opis i podejście</h4>
                <blockquote className="border-l-4 pl-3 text-muted-foreground whitespace-pre-wrap">
                  {detailApp?.coverLetter || detailBid?.technicalProposal || '—'}
                </blockquote>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Załączniki</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {detailApp && detailApp.attachments?.length ? (
                    detailApp.attachments.map((f) => <li key={f.id}>{f.name}</li>)
                  ) : detailBid && detailBid.attachments?.length ? (
                    detailBid.attachments.map((raw, idx) => (
                      <li key={idx}>{String((raw as { name?: string }).name || 'Plik')}</li>
                    ))
                  ) : (
                    <li className="list-none pl-0 text-muted-foreground">Brak załączników</li>
                  )}
                </ul>
              </div>
                </>
              )}

              {detailProfile && (
                <div>
                  <h4 className="font-semibold mb-1">Profil wykonawcy</h4>
                  <ul className="space-y-1">
                    <li>
                      <strong>Status:</strong>{' '}
                      {detailProfile.verification?.status === 'verified'
                        ? `Zweryfikowana (NIP: ${detailProfile.businessInfo?.nip || '—'})`
                        : 'W trakcie weryfikacji'}
                    </li>
                    <li>
                      <strong>Ubezpieczenie OC:</strong>{' '}
                      {detailProfile.insurance?.hasOC
                        ? `Ważne do ${detailProfile.insurance.validUntil || '—'}`
                        : 'Brak'}
                    </li>
                    <li>
                      <strong>Doświadczenie:</strong> {detailProfile.experience?.completedProjects ?? 0}{' '}
                      zrealizowanych zgłoszeń
                    </li>
                    <li>
                      <strong>Średnia ocen:</strong> ⭐{' '}
                      {(detailProfile.rating?.overall ?? detailApp?.contractorRating ?? detailBid?.contractorRating ?? 0).toFixed(1)}
                      /5.0
                      {detailProfile.rating?.reviewsCount != null && detailProfile.rating.reviewsCount > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          (na podstawie {detailProfile.rating.reviewsCount}{' '}
                          opinii)
                        </span>
                      )}
                    </li>
                  </ul>
                </div>
              )}

              {isSelectedOffer && showContactDetails ? (
                <section className="rounded-xl border bg-muted/30 p-4">
                  <h4 className="mb-3 text-sm font-semibold">Kontakt do wykonawcy</h4>
                  {detailProfile ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>{detailProfile.contactInfo?.phone || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>{detailProfile.contactInfo?.email || '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Brak danych kontaktowych w profilu wykonawcy.
                    </p>
                  )}
                </section>
              ) : null}

              {(showSelectInDetail || isSelectedOffer) ? (
                <div className="flex flex-col gap-2 sm:flex-row pt-2">
                  {showSelectInDetail ? (
                    <Button className="flex-1" onClick={openConfirmSelect}>
                      Wybierz tę ofertę
                    </Button>
                  ) : null}
                  {isSelectedOffer ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowContactDetails((prev) => !prev)}
                    >
                      {showContactDetails ? 'Ukryj dane kontaktowe' : 'Zapytaj o szczegóły'}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmSelectOpen}
        onOpenChange={(open) => {
          setConfirmSelectOpen(open);
          if (!open) setPendingSelectBid(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz wybrać tę ofertę?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSelectBid || detailBid ? (
                <>
                  Wykonawca:{' '}
                  <strong>
                    {(pendingSelectBid ?? detailBid)?.contractorCompany}
                  </strong>
                  . Po potwierdzeniu pozostałe oferty zostaną odrzucone, a Ty zobaczysz pełne
                  dane kontaktowe wykonawcy.
                </>
              ) : (
                <>
                  Po potwierdzeniu pozostałe oferty zostaną odrzucone, a Ty zobaczysz pełne dane
                  kontaktowe wykonawcy na stronie zgłoszenia.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={selectingOffer}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmSelectOffer()} disabled={selectingOffer}>
              {selectingOffer ? 'Zapisywanie…' : 'Potwierdzam wybór'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
