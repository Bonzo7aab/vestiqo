'use client';

import Link from 'next/link';
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarClock,
  CreditCard,
  FileStack,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  StickyNote,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { VerificationStatusBadge } from './VerificationStatusBadge';
import { VerificationDocumentList } from './VerificationDocumentList';
import {
  VerificationRejectReasonFields,
  buildRejectReasonFromFields,
} from './VerificationRejectReasonFields';
import type { VerificationRejectionReasonId } from '../../lib/verification/status';
import type { AdminUserStatus } from '../../lib/verification/types';
import {
  approveVerificationSubjectAction,
  rejectVerificationSubjectAction,
} from '../../app/administracja/actions';
import type {
  AdminVerificationSubjectProfile,
  DocumentReview,
  DocumentReviewMap,
  VerificationDocumentEntry,
} from '../../lib/database/admin-verification';
import { AdminDeleteUserAccountButton } from './AdminDeleteUserAccountButton';
import { formatIbanDisplay } from '../../lib/contractor/iban';

interface VerificationSubjectPanelProps {
  subjectUserId: string;
  firstName: string;
  lastName: string;
  userType: string;
  adminDisplayStatus: AdminUserStatus;
  rejectionReason: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  companyNip: string | null;
  companyCity: string | null;
  documentsSubmitted: number;
  documentsExpected: number;
  createdAt: string | null;
  updatedAt: string | null;
  submittedAt: string | null;
  notesCount: number;
  documents: VerificationDocumentEntry[];
  reviews: DocumentReviewMap;
  lastDecisionAt: string | null;
  ocValidUntil: string | null;
  profileDetails: AdminVerificationSubjectProfile;
}

type DocReviewState = 'approved' | 'rejected' | 'unreviewed' | 'missing';

interface DocReviewSnapshot {
  key: string;
  label: string;
  state: DocReviewState;
  review: DocumentReview | null;
}

function userTypeLabel(value: string): string {
  switch (value) {
    case 'manager':
      return 'Zarządca';
    case 'contractor':
      return 'Wykonawca';
    default:
      return value;
  }
}

function userInitials(first: string, last: string): string {
  const f = first.trim().charAt(0).toUpperCase();
  const l = last.trim().charAt(0).toUpperCase();
  return `${f}${l}` || '?';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function formatDateOnly(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function formatPlnAmount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAddressLine(
  address: string | null,
  postalCode: string | null,
  city: string | null
): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  const locality = [postalCode, city].filter(Boolean).join(' ');
  if (locality) parts.push(locality);
  return parts.join(', ') || '—';
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function isReviewStale(uploadedAt: string | null, review: DocumentReview | null): boolean {
  if (!review || !uploadedAt) return false;
  const docMs = Date.parse(uploadedAt);
  const reviewMs = Date.parse(review.reviewedAt);
  if (!Number.isFinite(docMs) || !Number.isFinite(reviewMs)) return false;
  return docMs > reviewMs;
}

function buildSnapshots(
  documents: VerificationDocumentEntry[],
  reviews: DocumentReviewMap
): DocReviewSnapshot[] {
  return documents.map((doc) => {
    if (doc.missing) {
      return { key: doc.key, label: doc.label, state: 'missing', review: null };
    }
    const review = reviews[doc.key] ?? null;
    const stale = isReviewStale(doc.uploadedAt, review);
    if (!review || stale) {
      return { key: doc.key, label: doc.label, state: 'unreviewed', review: null };
    }
    return {
      key: doc.key,
      label: doc.label,
      state: review.status,
      review,
    };
  });
}

function buildPrefilledRejectReason(snapshots: DocReviewSnapshot[]): string {
  const rejected = snapshots.filter((s) => s.state === 'rejected' && s.review?.reason);
  if (rejected.length === 0) return '';
  return rejected.map((s) => `• ${s.label}: ${s.review!.reason}`).join('\n');
}

export function VerificationSubjectPanel({
  subjectUserId,
  firstName,
  lastName,
  userType,
  adminDisplayStatus,
  rejectionReason,
  email,
  phone,
  companyName,
  companyNip,
  companyCity,
  documentsSubmitted,
  documentsExpected,
  createdAt,
  updatedAt,
  submittedAt,
  notesCount,
  documents,
  reviews,
  lastDecisionAt,
  ocValidUntil,
  profileDetails,
}: VerificationSubjectPanelProps): React.ReactElement {
  const isContractor = userType === 'contractor';
  const ibanDisplay = profileDetails.bankAccountIban
    ? formatIbanDisplay(profileDetails.bankAccountIban)
    : '—';
  const snapshots = React.useMemo(() => buildSnapshots(documents, reviews), [documents, reviews]);
  const missingCount = snapshots.filter((s) => s.state === 'missing').length;
  const unreviewed = snapshots.filter((s) => s.state === 'unreviewed').length;
  const rejected = snapshots.filter((s) => s.state === 'rejected').length;
  const allReviewed = unreviewed === 0 && missingCount === 0;
  const isManager = userType === 'manager';
  const hasUploadedDocs = documents.some((doc) => !doc.missing);
  const canApprove = (isManager && !hasUploadedDocs) || (allReviewed && rejected === 0);
  const canReject = !hasUploadedDocs || allReviewed;

  const documentPrefill = React.useMemo(() => buildPrefilledRejectReason(snapshots), [snapshots]);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReasonId, setRejectReasonId] = React.useState<VerificationRejectionReasonId | ''>('');
  const [rejectCustomReason, setRejectCustomReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const composedRejectReason = React.useMemo(
    () => buildRejectReasonFromFields(rejectReasonId, rejectCustomReason, documentPrefill),
    [rejectReasonId, rejectCustomReason, documentPrefill]
  );

  const handleApprove = async (): Promise<void> => {
    if (!canApprove) {
      if (missingCount > 0) {
        toast.error('Użytkownik nie przesłał wszystkich wymaganych dokumentów.');
        return;
      }
      toast.error('Najpierw zaakceptuj wszystkie dokumenty.');
      return;
    }
    setBusy(true);
    try {
      const res = await approveVerificationSubjectAction(subjectUserId);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd akceptacji');
        return;
      }
      toast.success('Zweryfikowano');
      window.location.href = '/administracja/weryfikacja';
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!canReject) {
      toast.error('Najpierw oceń wszystkie przesłane dokumenty.');
      return;
    }
    if (!composedRejectReason?.trim()) {
      toast.error('Wybierz powód odrzucenia weryfikacji.');
      return;
    }
    setBusy(true);
    try {
      const res = await rejectVerificationSubjectAction(subjectUserId, composedRejectReason);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd odrzucenia');
        return;
      }
      toast.success('Odrzucono weryfikację');
      window.location.href = '/administracja/weryfikacja';
    } finally {
      setBusy(false);
    }
  };

  const updatedCount =
    lastDecisionAt != null
      ? documents.filter(
          (d) =>
            !d.missing &&
            d.uploadedAt &&
            Date.parse(d.uploadedAt) > Date.parse(lastDecisionAt)
        ).length
      : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary"
              >
                {userInitials(firstName, lastName)}
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-semibold">
                  {firstName} {lastName}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{userTypeLabel(userType)}</Badge>
                  <VerificationStatusBadge state={adminDisplayStatus} />
                  <Link
                    href="#admin-notes"
                    className="inline-flex items-center gap-1 rounded-md border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    title="Przejdź do notatek"
                  >
                    <StickyNote className="h-3.5 w-3.5" />
                    Notatki
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                      {notesCount}
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <Button
                type="button"
                disabled={busy || !canApprove}
                onClick={() => void handleApprove()}
                className={
                  canApprove ? 'bg-emerald-600 text-white hover:bg-emerald-700' : undefined
                }
                title={
                  missingCount > 0
                    ? 'Brakuje wymaganych dokumentów w profilu.'
                    : !allReviewed
                      ? 'Najpierw oceń wszystkie przesłane dokumenty.'
                      : rejected > 0
                        ? 'Nie można zaakceptować, gdy są odrzucone dokumenty.'
                        : undefined
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Akceptuj
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setRejectOpen((prev) => !prev)}
              >
                <ShieldX className="h-4 w-4" />
                Odrzuć
              </Button>
              <AdminDeleteUserAccountButton
                userId={subjectUserId}
                userLabel={`${firstName} ${lastName}`.trim()}
                variant="destructive"
                size="default"
              />
            </div>
          </div>

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem icon={Building2} label="Firma" value={companyName ?? '—'} />
            <MetaItem icon={Hash} label="NIP" value={companyNip ?? '—'} />
            <MetaItem icon={Hash} label="REGON" value={profileDetails.companyRegon ?? '—'} />
            <MetaItem icon={Hash} label="KRS" value={profileDetails.companyKrs ?? '—'} />
            <MetaItem
              icon={MapPin}
              label="Adres"
              value={formatAddressLine(
                profileDetails.companyAddress,
                profileDetails.companyPostalCode,
                companyCity
              )}
            />
            <MetaItem icon={Mail} label="E-mail (konto)" value={email ?? '—'} />
            {profileDetails.companyEmail && profileDetails.companyEmail !== email ? (
              <MetaItem icon={Mail} label="E-mail (firma)" value={profileDetails.companyEmail} />
            ) : null}
            <MetaItem icon={Phone} label="Telefon (konto)" value={phone ?? '—'} />
            {profileDetails.companyPhone && profileDetails.companyPhone !== phone ? (
              <MetaItem icon={Phone} label="Telefon (firma)" value={profileDetails.companyPhone} />
            ) : null}
            {profileDetails.companyWebsite ? (
              <MetaItem icon={Globe} label="Strona WWW" value={profileDetails.companyWebsite} />
            ) : null}
            {isContractor ? (
              <>
                <MetaItem icon={CreditCard} label="IBAN" value={ibanDisplay} />
                <MetaItem
                  icon={Building2}
                  label="Status VAT"
                  value={profileDetails.vatStatusLabel ?? '—'}
                />
                <MetaItem
                  icon={ShieldCheck}
                  label="Suma gwarancyjna OC"
                  value={formatPlnAmount(profileDetails.ocGuaranteeAmountPln)}
                />
                <MetaItem
                  icon={CalendarClock}
                  label="Ważność OC"
                  value={formatDateOnly(ocValidUntil)}
                />
              </>
            ) : null}
            <MetaItem
              icon={FileStack}
              label="Wymagane dokumenty"
              value={`${documentsSubmitted} / ${documentsExpected} przesłanych`}
            />
            <MetaItem icon={CalendarClock} label="Rozpoczęta" value={formatDate(createdAt)} />
            <MetaItem icon={CalendarClock} label="Zaktualizowana" value={formatDate(updatedAt)} />
            {submittedAt ? (
              <MetaItem
                icon={CalendarClock}
                label="Przesłano do weryfikacji"
                value={formatDate(submittedAt)}
              />
            ) : null}
          </div>
        </CardContent>

        {rejectOpen ? (
          <div className="border-t border-destructive/20 bg-destructive/[0.04] px-5 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-destructive">Powód odrzucenia</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                disabled={busy}
                onClick={() => setRejectOpen(false)}
                aria-label="Zamknij"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <VerificationRejectReasonFields
              reasonId={rejectReasonId}
              customReason={rejectCustomReason}
              onReasonIdChange={setRejectReasonId}
              onCustomReasonChange={setRejectCustomReason}
              disabled={busy}
              compact
            />
            {documentPrefill.trim() ? (
              <p className="rounded border border-destructive/15 bg-background/80 px-2.5 py-1.5 text-xs text-muted-foreground whitespace-pre-wrap">
                {documentPrefill}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy || !canReject || !composedRejectReason?.trim()}
                onClick={() => void handleReject()}
              >
                <ShieldX className="h-3.5 w-3.5" />
                Potwierdź odrzucenie
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRejectOpen(false)}
              >
                Anuluj
              </Button>
            </div>
          </div>
        ) : rejectionReason ? (
          <div className="border-t border-destructive/20 bg-destructive/[0.04] px-5 py-2.5">
            <p className="text-xs font-medium text-destructive">Powód odrzucenia</p>
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap leading-snug">
              {rejectionReason}
            </p>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Dokumenty</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Wymagane dokumenty</p>
            </div>
            {lastDecisionAt && updatedCount === 0 && (
              <Badge variant="outline" className="text-xs">
                Brak zmian od ostatniej decyzji
              </Badge>
            )}
            {lastDecisionAt && updatedCount > 0 && (
              <Badge className="border border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 text-xs">
                <RefreshCw className="h-3 w-3" />
                {updatedCount} zaktualizowanych
              </Badge>
            )}
          </div>
          {lastDecisionAt && (
            <p className="text-xs text-muted-foreground">
              Ostatnia decyzja: {new Date(lastDecisionAt).toLocaleString('pl-PL')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <VerificationDocumentList
            documents={documents}
            updatedSince={lastDecisionAt}
            reviews={reviews}
            subjectUserId={subjectUserId}
            ocValidUntil={userType === 'contractor' ? ocValidUntil : null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
