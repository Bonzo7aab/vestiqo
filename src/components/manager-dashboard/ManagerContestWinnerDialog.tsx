'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import {
  Award,
  Calendar,
  ExternalLink,
  Mail,
  Phone,
  Star,
  User,
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { fetchContractorById } from '../../lib/database/contractors';
import { fetchAcceptedTenderBid } from '../../lib/database/offer-selection';
import type { ContestOfferDetails } from '../../types/contest-offer';
import { computeGrossFromNet } from '../../types/contest-offer';
import type { ContractorProfile } from '../../types/contractor';
import { cn } from '../ui/utils';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface ManagerContestWinnerDialogProps {
  contestId: string | null;
  contestTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WinnerBidView {
  contractorCompany: string;
  contractorCompanyId: string;
  contractorName: string;
  contractorRating: number;
  netPrice: number;
  grossPrice: number;
  vatLabel: string;
  proposedTimeline: number;
  proposedStartDate: string;
  guaranteeMonths: number;
  technicalProposal: string;
  documents: Array<{ name: string; url?: string }>;
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

function parseWinnerBid(raw: Record<string, unknown>): WinnerBidView {
  const offerDetails = raw.offerDetails as ContestOfferDetails | null | undefined;
  const net =
    typeof offerDetails?.netPrice === 'number'
      ? offerDetails.netPrice
      : Number(raw.totalPrice ?? raw.bid_amount ?? 0);
  const vatRate = offerDetails?.vatRate ?? '23';
  const vatLabel = vatRate === 'zw' ? 'ZW' : vatRate === '8' ? '8%' : '23%';
  const gross =
    typeof offerDetails?.grossPrice === 'number'
      ? offerDetails.grossPrice
      : vatRate === 'zw'
        ? net
        : computeGrossFromNet(net, vatRate);

  const docs: Array<{ name: string; url?: string }> = [];
  if (offerDetails?.formalAttachments) {
    for (const ref of Object.values(offerDetails.formalAttachments)) {
      if (ref?.name) docs.push({ name: ref.name, url: ref.url });
    }
  }
  if (offerDetails?.qualificationAttachments) {
    for (const ref of offerDetails.qualificationAttachments) {
      if (ref?.name) docs.push({ name: ref.name, url: ref.url });
    }
  }
  if (offerDetails?.extraAttachments) {
    for (const ref of offerDetails.extraAttachments) {
      if (ref?.name) docs.push({ name: ref.name, url: ref.url });
    }
  }

  return {
    contractorCompany: String(raw.contractorCompany ?? ''),
    contractorCompanyId: String(raw.contractorCompanyId ?? ''),
    contractorName: String(raw.contractorName ?? ''),
    contractorRating: Number(raw.contractorRating ?? 0),
    netPrice: net,
    grossPrice: gross,
    vatLabel,
    proposedTimeline: Number(raw.proposedTimeline ?? 0),
    proposedStartDate: String(raw.proposedStartDate ?? ''),
    guaranteeMonths: Number(
      offerDetails?.guaranteeMonths ?? offerDetails?.warrantyMonths ?? raw.guaranteePeriod ?? 0,
    ),
    technicalProposal: String(raw.technicalProposal ?? ''),
    documents: docs,
  };
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}): ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        highlight ? 'border-green-200 bg-green-50/80 dark:border-green-800 dark:bg-green-950/40' : 'bg-muted/30',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-semibold mt-0.5', highlight && 'text-green-800 dark:text-green-300')}>
        {value}
      </p>
    </div>
  );
}

export function ManagerContestWinnerDialog({
  contestId,
  contestTitle,
  open,
  onOpenChange,
}: ManagerContestWinnerDialogProps): ReactElement {
  const [loading, setLoading] = useState(false);
  const [bid, setBid] = useState<WinnerBidView | null>(null);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!open || !contestId) {
      return;
    }

    let cancelled = false;

    const run = async (): Promise<void> => {
      setLoading(true);
      setLoadFailed(false);
      setBid(null);
      setProfile(null);

      try {
        const supabase = createClient();
        const bidRaw = await fetchAcceptedTenderBid(supabase, contestId);
        if (cancelled) return;

        if (!bidRaw) {
          setLoadFailed(true);
          return;
        }

        const view = parseWinnerBid(bidRaw as unknown as Record<string, unknown>);
        setBid(view);

        if (view.contractorCompanyId) {
          const p = await fetchContractorById(view.contractorCompanyId);
          if (!cancelled) setProfile(p);
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, contestId]);

  const phone = profile?.contactInfo?.phone;
  const email = profile?.contactInfo?.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="rounded-t-lg bg-gradient-to-r from-green-700 to-emerald-600 px-6 py-5 text-white">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Award className="h-6 w-6" />
              </div>
              <div className="min-w-0 space-y-1">
                <DialogTitle className="text-white text-xl">Wygrana oferta</DialogTitle>
                <DialogDescription className="text-green-50/90">
                  {contestTitle ?? 'Szczegóły wybranej oferty wykonawcy'}
                </DialogDescription>
              </div>
            </div>
            {bid ? (
              <Badge className="bg-white/20 text-white hover:bg-white/20 border-0">
                {bid.contractorCompany}
              </Badge>
            ) : null}
          </DialogHeader>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
              Ładowanie wybranej oferty…
            </div>
          ) : loadFailed || !bid ? (
            <p className="text-center text-muted-foreground py-10">
              Brak wybranej oferty dla tego konkursu.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatTile label="Cena netto" value={formatMoney(bid.netPrice)} highlight />
                <StatTile label="Cena brutto" value={formatMoney(bid.grossPrice)} highlight />
                <StatTile label="VAT" value={bid.vatLabel} />
                <StatTile
                  label="Ocena"
                  value={`⭐ ${bid.contractorRating.toFixed(1)}`}
                />
                <StatTile label="Start" value={formatDate(bid.proposedStartDate)} />
                <StatTile
                  label="Realizacja"
                  value={`${bid.proposedTimeline} ${bid.proposedTimeline === 1 ? 'dzień' : 'dni'}`}
                />
                <StatTile label="Gwarancja" value={`${bid.guaranteeMonths} msc`} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Kontakt wykonawcy
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Osoba: </span>
                      <span className="font-medium">{bid.contractorName || '—'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {phone ? (
                        <a href={`tel:${phone}`} className="hover:underline">
                          {phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {email ? (
                        <a href={`mailto:${email}`} className="hover:underline break-all">
                          {email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </p>
                    {bid.contractorCompanyId ? (
                      <Link
                        href={`/wykonawcy/${bid.contractorCompanyId}`}
                        className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline pt-1"
                      >
                        Profil wykonawcy
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Harmonogram
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Termin rozpoczęcia: </span>
                      {formatDate(bid.proposedStartDate)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Czas realizacji: </span>
                      {bid.proposedTimeline} {bid.proposedTimeline === 1 ? 'dzień' : 'dni'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Gwarancja: </span>
                      {bid.guaranteeMonths} mies.
                    </p>
                  </div>
                </div>
              </div>

              {bid.technicalProposal ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <h3 className="text-sm font-semibold mb-2">Opis i podejście</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {bid.technicalProposal}
                  </p>
                </div>
              ) : null}

              {bid.documents.length > 0 ? (
                <div className="rounded-lg border p-4">
                  <h3 className="text-sm font-semibold mb-2">Załączniki oferty</h3>
                  <ul className="space-y-1 text-sm">
                    {bid.documents.map((doc) => (
                      <li key={doc.name}>
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
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
