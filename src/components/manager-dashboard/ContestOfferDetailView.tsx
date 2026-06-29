'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Shield,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ContestOfferDetails, ContestOfferAttachmentRef, FormalRequirementKey } from '../../types/contest-offer';
import { FORMAL_REQUIREMENT_LABELS } from '../../lib/database/contest-offers';
import { formatMonthsLabel } from '../../lib/contest-offer/warranty-period-options';
import { getAttachmentDownloadUrl } from '../../lib/storage/bid-attachments';
import { cn } from '../ui/utils';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

export interface ContestOfferDetailBid {
  contractorCompany: string;
  contractorRating: number;
  contractorReviewsCount?: number;
  proposedStartDate: Date;
  proposedTimeline: number;
  guaranteePeriod: number;
  warrantyMonths?: number | null;
  technicalProposal: string;
  offerDetails?: ContestOfferDetails | Record<string, unknown> | null;
}

interface ContestOfferDetailViewProps {
  bid: ContestOfferDetailBid;
  formatMoney: (amount: number) => string;
  formatDate: (d: Date | string | undefined) => string;
  netFromBid: (bid: ContestOfferDetailBid) => number;
  bruttoFromBid: (bid: ContestOfferDetailBid) => number;
  vatLabelFromBid: (bid: ContestOfferDetailBid) => string;
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Calendar;
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function TextBlock({ title, content }: { title: string; content: string }): ReactElement {
  return (
    <section className="rounded-xl border bg-muted/30 p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{content}</p>
    </section>
  );
}

function AttachmentDownloadButton({
  attachment,
}: {
  attachment: ContestOfferAttachmentRef;
}): ReactElement {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClick = async (): Promise<void> => {
    setIsDownloading(true);
    try {
      let url: string | null | undefined = attachment.url;
      if (attachment.path) {
        url = await getAttachmentDownloadUrl(attachment.path, attachment.name);
      }
      if (!url) {
        toast.error('Nie udało się pobrać pliku');
        return;
      }

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      toast.error('Nie udało się pobrać pliku');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!attachment.url && !attachment.path) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isDownloading}
      className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
    >
      <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{attachment.name}</span>
      {isDownloading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}

function FormalAttachmentRow({
  requirementKey,
  attachment,
}: {
  requirementKey: string;
  attachment: ContestOfferAttachmentRef;
}): ReactElement {
  const label = FORMAL_REQUIREMENT_LABELS[requirementKey as FormalRequirementKey] ?? requirementKey;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <AttachmentDownloadButton attachment={attachment} />
    </div>
  );
}

export function ContestOfferDetailView({
  bid,
  formatMoney,
  formatDate,
  netFromBid,
  bruttoFromBid,
  vatLabelFromBid,
}: ContestOfferDetailViewProps): ReactElement {
  const details = bid.offerDetails as ContestOfferDetails | null | undefined;
  const net = netFromBid(bid);
  const brutto = bruttoFromBid(bid);
  const reviews = bid.contractorReviewsCount ?? 0;

  const formalDocs = details?.formalAttachments
    ? Object.entries(details.formalAttachments).filter(
        (entry): entry is [string, ContestOfferAttachmentRef] => Boolean(entry[1]?.name),
      )
    : [];
  const offerDocs = (details?.extraAttachments ?? []).filter(
    (ref) => ref.requirementKey !== 'deposit',
  );
  const depositDoc = (details?.extraAttachments ?? []).find(
    (ref) => ref.requirementKey === 'deposit',
  );

  const warrantyLabel =
    details?.warrantyMonths != null
      ? formatMonthsLabel(details.warrantyMonths)
      : bid.warrantyMonths != null
        ? formatMonthsLabel(bid.warrantyMonths)
        : bid.guaranteePeriod
          ? `${bid.guaranteePeriod} msc`
          : '—';

  const guaranteeLabel =
    details?.guaranteeMonths != null ? formatMonthsLabel(details.guaranteeMonths) : '—';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Wykonawca
            </p>
            <p className="mt-1 text-lg font-semibold">{bid.contractorCompany}</p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            ⭐ {bid.contractorRating.toFixed(1)}
            {reviews > 0 ? ` · ${reviews} ${reviews === 1 ? 'ocena' : 'ocen'}` : ''}
          </Badge>
        </div>

        <Separator className="my-4" />

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailField label="Cena netto" value={formatMoney(net)} />
          <DetailField label="Cena brutto" value={formatMoney(brutto)} />
          <DetailField label="Stawka VAT" value={vatLabelFromBid(bid)} />
        </dl>
      </div>

      <SectionCard icon={Calendar} title="Harmonogram">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField
            label="Oferowany termin wykonania"
            value={formatDate(details?.proposedCompletionDate ?? bid.proposedStartDate)}
          />
          {bid.proposedTimeline ? (
            <DetailField
              label="Szacowany czas realizacji"
              value={`${bid.proposedTimeline} ${bid.proposedTimeline === 1 ? 'dzień' : 'dni'}`}
            />
          ) : null}
          {details?.siteVisitConfirmed != null ? (
            <DetailField
              label="Wizja lokalna"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {details.siteVisitConfirmed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                      Potwierdzona
                    </>
                  ) : (
                    'Nie potwierdzona'
                  )}
                </span>
              }
            />
          ) : null}
        </dl>
      </SectionCard>

      <SectionCard icon={Wallet} title="Warunki finansowe">
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailField label="Okres gwarancji" value={warrantyLabel} />
          <DetailField label="Okres rękojmi" value={guaranteeLabel} />
          {details?.paymentTermsAccepted != null ? (
            <DetailField
              label="Warunki płatności"
              value={details.paymentTermsAccepted ? 'Zaakceptowane' : 'Nie zaakceptowane'}
              className="sm:col-span-2"
            />
          ) : null}
        </dl>
      </SectionCard>

      {details?.referencesText?.trim() ? (
        <TextBlock title="Referencje — wykaz zrealizowanych prac" content={details.referencesText} />
      ) : null}

      {bid.technicalProposal?.trim() ? (
        <TextBlock title="Opis techniczny" content={bid.technicalProposal} />
      ) : null}

      {formalDocs.length > 0 ? (
        <SectionCard icon={Shield} title="Dokumenty formalne">
          <div className="space-y-3">
            {formalDocs.map(([key, ref]) => (
              <FormalAttachmentRow key={key} requirementKey={key} attachment={ref} />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {offerDocs.length > 0 ? (
        <SectionCard icon={FileText} title="Dokumentacja ofertowa">
          <div className="space-y-2">
            {offerDocs.map((ref) => (
              <AttachmentDownloadButton key={ref.id} attachment={ref} />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {depositDoc ? (
        <SectionCard icon={FileText} title="Potwierdzenie wadium">
          <AttachmentDownloadButton attachment={depositDoc} />
        </SectionCard>
      ) : null}
    </div>
  );
}
