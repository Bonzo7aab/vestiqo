'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import { fetchTenderBidsByTenderId } from '../../lib/database/jobs';
import type { ContestOfferDetails } from '../../types/contest-offer';
import { computeGrossFromNet } from '../../types/contest-offer';
import type { ContestOfferVatRate } from '../../types/contest-offer';
import { cn } from '../ui/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface TenderBidRow {
  id: string;
  contractorCompany: string;
  contractorRating: number;
  contractorReviewsCount?: number;
  totalPrice: number;
  netPrice?: number;
  vatRate?: ContestOfferVatRate | null;
  grossPrice?: number | null;
  warrantyMonths?: number | null;
  guaranteePeriod?: number;
  proposedTimeline?: number;
  proposedStartDate?: Date | string;
  status?: string;
  offerDetails?: ContestOfferDetails | Record<string, unknown> | null;
  attachments?: Array<Record<string, unknown>>;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount);
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

function netFromBid(bid: TenderBidRow): number {
  return bid.netPrice ?? bid.totalPrice;
}

function vatLabelFromBid(bid: TenderBidRow): string {
  if (bid.vatRate === 'zw') return 'ZW';
  if (bid.vatRate === '8') return '8%';
  if (bid.vatRate === '23') return '23%';
  return '23%';
}

function bruttoFromBid(bid: TenderBidRow): number {
  if (bid.grossPrice != null && !Number.isNaN(bid.grossPrice)) {
    return bid.grossPrice;
  }
  const net = netFromBid(bid);
  const rate = bid.vatRate ?? '23';
  if (rate === 'zw') return net;
  return computeGrossFromNet(net, rate);
}

function collectContestDocuments(bid: TenderBidRow): Array<{ name: string; url?: string }> {
  const details = bid.offerDetails as ContestOfferDetails | null | undefined;
  const docs: Array<{ name: string; url?: string }> = [];
  if (details?.formalAttachments) {
    for (const ref of Object.values(details.formalAttachments)) {
      if (ref?.name) docs.push({ name: ref.name, url: ref.url });
    }
  }
  if (details?.qualificationAttachments) {
    for (const ref of details.qualificationAttachments) {
      if (ref?.name) docs.push({ name: ref.name, url: ref.url });
    }
  }
  if (details?.extraAttachments) {
    for (const ref of Object.values(details.extraAttachments)) {
      if (ref?.name) docs.push({ name: ref.name, url: ref.url });
    }
  }
  if (docs.length === 0 && bid.attachments?.length) {
    for (const raw of bid.attachments) {
      docs.push({ name: String((raw as { name?: string }).name ?? 'Plik') });
    }
  }
  return docs;
}

interface ManagerContestOffersDialogProps {
  contestId: string | null;
  contestTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagerContestOffersDialog({
  contestId,
  contestTitle,
  open,
  onOpenChange,
}: ManagerContestOffersDialogProps): ReactElement {
  const [loading, setLoading] = useState(false);
  const [bids, setBids] = useState<TenderBidRow[]>([]);

  useEffect(() => {
    if (!open || !contestId) {
      return;
    }

    let cancelled = false;

    const run = async (): Promise<void> => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await fetchTenderBidsByTenderId(supabase, contestId, {
          submittedOnly: true,
        });
        if (cancelled) return;
        if (error) {
          toast.error('Nie udało się wczytać ofert');
          setBids([]);
        } else {
          setBids((data ?? []) as unknown as TenderBidRow[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, contestId]);

  const sortedBids = useMemo(
    () =>
      [...bids].sort((a, b) => {
        if (a.status === 'accepted') return -1;
        if (b.status === 'accepted') return 1;
        return a.contractorCompany.localeCompare(b.contractorCompany, 'pl');
      }),
    [bids],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Złożone oferty</DialogTitle>
          <DialogDescription>
            {contestTitle ?? 'Lista ofert w konkursie'}
            {sortedBids.some((b) => b.status === 'accepted') ? (
              <span className="block mt-1 text-green-700 dark:text-green-400 font-medium">
                Wiersz na zielono oznacza wybraną ofertę (wygrana).
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2" />
              Ładowanie ofert…
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Wykonawca</TableHead>
                    <TableHead className="whitespace-nowrap">Cena netto</TableHead>
                    <TableHead>VAT</TableHead>
                    <TableHead className="whitespace-nowrap">Cena brutto</TableHead>
                    <TableHead className="whitespace-nowrap">Start</TableHead>
                    <TableHead className="whitespace-nowrap">Realizacja</TableHead>
                    <TableHead className="whitespace-nowrap">Gwarancja</TableHead>
                    <TableHead className="min-w-[160px]">Dokumenty</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBids.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                        Brak złożonych ofert.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedBids.map((bid) => {
                      const isWinner = bid.status === 'accepted';
                      const warranty = bid.warrantyMonths ?? bid.guaranteePeriod ?? null;
                      const timeline = bid.proposedTimeline ?? null;
                      const docs = collectContestDocuments(bid);
                      return (
                        <TableRow
                          key={bid.id}
                          className={cn(
                            isWinner &&
                              'bg-green-50 dark:bg-green-950/30 border-l-4 border-l-green-600',
                          )}
                        >
                          <TableCell>
                            <div className="font-medium">{bid.contractorCompany}</div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              ⭐ {bid.contractorRating.toFixed(1)}
                              {bid.contractorReviewsCount
                                ? ` · ${bid.contractorReviewsCount} ocen`
                                : ''}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {formatMoney(netFromBid(bid))}
                          </TableCell>
                          <TableCell>{vatLabelFromBid(bid)}</TableCell>
                          <TableCell className="font-semibold whitespace-nowrap tabular-nums">
                            {formatMoney(bruttoFromBid(bid))}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(bid.proposedStartDate)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {timeline != null
                              ? `${timeline} ${timeline === 1 ? 'dzień' : 'dni'}`
                              : '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {warranty != null ? `${warranty} msc` : '—'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[220px]">
                            {docs.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <ul className="space-y-0.5">
                                {docs.slice(0, 2).map((doc) => (
                                  <li key={doc.name} className="truncate" title={doc.name}>
                                    {doc.url ? (
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {doc.name}
                                      </a>
                                    ) : (
                                      doc.name
                                    )}
                                  </li>
                                ))}
                                {docs.length > 2 ? (
                                  <li className="text-muted-foreground text-xs">
                                    +{docs.length - 2} więcej
                                  </li>
                                ) : null}
                              </ul>
                            )}
                          </TableCell>
                          <TableCell>
                            {isWinner ? (
                              <span className="text-sm font-semibold text-green-700 dark:text-green-400 whitespace-nowrap">
                                Wygrana
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                Złożona
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
