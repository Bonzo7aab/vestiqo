'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Upload,
  FileText,
  Shield,
  Check,
  AlertTriangle,
  Info,
  X,
  Clock,
  ShieldCheck,
  ShieldX,
  CalendarClock,
  Calendar,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  Building2,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { cn } from './ui/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useUserProfile } from '../contexts/AuthContext';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from './ui/dropzone';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import {
  removeAccountVerificationDocumentAction,
  submitVerificationDocumentsAction,
} from '../app/weryfikacja/actions';
import { uploadVerificationDocumentClient } from '../lib/verification/upload-document-client';
import { DocumentRemovalAlertDialog } from './verification/DocumentRemovalAlertDialog';
import {
  getContractorAccountSettings,
  upsertContractorAccountSettings,
} from '../lib/database/contractor-account';
import { createClient } from '../lib/supabase/client';
import { fetchUserPrimaryCompany } from '../lib/database/companies';
import type { VerificationStatus } from '../lib/database/verification';
import type {
  DocumentReview,
  DocumentReviewMap,
  VerificationDocumentEntry,
} from '../lib/database/admin-verification';
import { ContractorProfessionalQualificationsSettings } from './ContractorProfessionalQualificationsSettings';
import { ContractorOfficialCertificatesSettings } from './ContractorOfficialCertificatesSettings';
import { ContractorProfessionalQualificationsChecklist } from './ContractorProfessionalQualificationsChecklist';

interface VerificationPageProps {
  initialStatus: VerificationStatus;
  existingDocuments: VerificationDocumentEntry[];
  /**
   * Per-document admin review map keyed by document type. Renders status
   * badges + rejection reasons next to each uploaded document so the user
   * understands which files passed and which need re-submission.
   */
  documentReviews?: DocumentReviewMap;
  /** When true, renders without standalone page chrome (for /konto tab). */
  embedded?: boolean;
  /** Contractor user id — renders uprawnienia zawodowe after Referencje in account tab. */
  userId?: string;
}

type DocumentReviewState = 'approved' | 'rejected' | 'pending' | 'stale';
/** File on record or satisfied via profile (KRS/OC) — shown in section header, not on file row. */
type DocHighlightStatus = DocumentReviewState | 'attached';

interface DocumentUpload {
  type: string;
  file: File | null;
  description: string;
  required: boolean;
}

function formatDateTime(value: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function renderDocumentIcon(type: string, className?: string): React.ReactElement {
  switch (type) {
    case 'company_registration':
      return <Building2 className={className} />;
    case 'insurance':
      return <Shield className={className} />;
    case 'certifications':
    case 'management_license':
      return <Award className={className} />;
    case 'references':
      return <Users className={className} />;
    default:
      return <FileText className={className} />;
  }
}

function parseOcGuaranteeAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function isOcPolicyDetailsComplete(ocValidUntil: string, ocGuaranteeAmount: string): boolean {
  return Boolean(ocValidUntil.trim()) && parseOcGuaranteeAmount(ocGuaranteeAmount) != null;
}

function isRequiredDocComplete(
  doc: { type: string; required: boolean },
  existingByKey: Record<string, VerificationDocumentEntry>,
  uploads: Record<string, DocumentUpload>,
  isContractor: boolean,
  hasOcPolicyInAccount: boolean,
  hasCompanyKrsOrRegon: boolean,
): boolean {
  if (!doc.required) return true;
  const hasExisting = Boolean(existingByKey[doc.type]);
  const hasNew = Boolean(uploads[doc.type]?.file);
  if (doc.type === 'insurance' && isContractor) {
    return hasNew || hasExisting || hasOcPolicyInAccount;
  }
  if (doc.type === 'company_registration' && isContractor) {
    return hasNew || hasExisting || hasCompanyKrsOrRegon;
  }
  return hasNew || hasExisting;
}

function resolveDocHighlightStatus(
  doc: { type: string; required: boolean },
  existingByKey: Record<string, VerificationDocumentEntry>,
  uploads: Record<string, DocumentUpload>,
  reviewByKey: DocumentReviewMap,
  isContractor: boolean,
  hasOcPolicyInAccount: boolean,
  hasCompanyKrsOrRegon: boolean,
): DocHighlightStatus | null {
  const existing = existingByKey[doc.type];
  const newFile = uploads[doc.type]?.file;
  if (existing) {
    const review = reviewByKey[existing.key] ?? null;
    const state = deriveDocumentReviewState(existing, review);
    // Optional documents are not part of verification acceptance — no status badge when approved.
    if (!doc.required && state === 'approved') {
      return null;
    }
    if (state === 'approved' || state === 'rejected' || state === 'stale') {
      return state;
    }
    return 'attached';
  }
  if (newFile) {
    return 'attached';
  }
  // Optional slots (certifications, references) — badge only when a file exists, not via profile fallbacks.
  if (!doc.required) {
    return null;
  }
  if (
    isRequiredDocComplete(
      doc,
      existingByKey,
      uploads,
      isContractor,
      hasOcPolicyInAccount,
      hasCompanyKrsOrRegon,
    )
  ) {
    return 'attached';
  }
  return null;
}

interface StateBannerProps {
  status: VerificationStatus;
  onAction?: () => void;
}

/**
 * Single, consistent banner for every verification state. The visual language
 * (icon disc + heading + meta strip + body + optional CTA) is unified across
 * approved / pending / rejected / unsubmitted so the user always sees a clear
 * decision at the top of the page.
 */
function VerificationStateBanner({ status, onAction }: StateBannerProps) {
  const { state, submittedAt, decidedAt, reason } = status;

  if (state === 'approved') {
    return (
      <Card className="overflow-hidden border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-emerald-700">Konto zweryfikowane</h3>
              <p className="text-sm text-muted-foreground">
                Twoja firma została zweryfikowana przez administratora, otrzymujesz oznaczenie
                &quot;Zweryfikowany&quot;
              </p>
            </div>
          </div>
          {onAction && (
            <Button onClick={onAction} className="self-start sm:self-center" variant="outline">
              Powrót do konta
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (state === 'pending') {
    return (
      <Card className="overflow-hidden border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
              <Clock className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <Badge className="border border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/10">
                W trakcie weryfikacji
              </Badge>
              <h3 className="text-xl font-semibold text-blue-700">
                Dokumenty oczekują na decyzję
              </h3>
              <p className="text-sm text-muted-foreground">
                Dziękujemy za przesłanie dokumentów. Administrator sprawdzi je w ciągu
                1–3 dni roboczych. Otrzymasz powiadomienie e-mail oraz w aplikacji o wyniku
                weryfikacji.
              </p>
              {submittedAt && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-background px-2 py-1 text-xs text-blue-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Przesłano: {formatDateTime(submittedAt)}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === 'rejected') {
    return (
      <Card className="overflow-hidden border-2 border-destructive/40 bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm">
              <ShieldX className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <Badge variant="destructive">Odrzucono</Badge>
              <h3 className="text-xl font-semibold text-destructive">Weryfikacja odrzucona</h3>
              {decidedAt && (
                <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Decyzja z dnia {formatDateTime(decidedAt)}
                </div>
              )}
            </div>
          </div>
          {reason && (
            <div className="rounded-md border border-destructive/30 bg-background p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-destructive">
                Powód odrzucenia
              </div>
              <p className="mt-1 text-sm text-foreground whitespace-pre-line">{reason}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // unsubmitted
  return (
    <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <CardContent className="flex items-start gap-4 p-6">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Shield className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <Badge variant="outline">Niezweryfikowane</Badge>
          <h3 className="text-xl font-semibold">Konto wymaga weryfikacji</h3>
          <p className="text-sm text-muted-foreground">
            Prześlij wymagane dokumenty, aby zweryfikować swoje konto. Proces jest bezpłatny i
            zajmuje 1–3 dni robocze.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface DocumentsCollapsibleSectionProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  id?: string;
  required?: boolean;
  highlightStatus?: DocHighlightStatus | null;
  children: React.ReactNode;
}

interface DocumentsSectionGroupProps {
  heading: string;
  description?: string;
  variant?: 'required' | 'optional';
  children: React.ReactNode;
}

function DocumentsSectionGroup({
  heading,
  description,
  variant = 'required',
  children,
}: DocumentsSectionGroupProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className={cn(
          'border-b px-4 py-4 sm:px-6',
          variant === 'required' ? 'bg-primary/5' : 'bg-muted/30',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{heading}</h3>
          <Badge
            variant={variant === 'required' ? 'secondary' : 'outline'}
            className="text-[10px] font-medium uppercase"
          >
            {variant === 'required' ? 'Wymagane' : 'Opcjonalne'}
          </Badge>
        </div>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function DocumentsCollapsibleSection({
  eyebrow,
  heading,
  description,
  id,
  required = false,
  highlightStatus = null,
  children,
}: DocumentsCollapsibleSectionProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible
      id={id}
      open={open}
      onOpenChange={setOpen}
      className="scroll-mt-24 border-b border-border last:border-b-0"
    >
      <CollapsibleTrigger className="flex w-full items-start gap-3 bg-muted/40 px-4 py-3 text-left hover:bg-muted/60 sm:px-6">
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-base font-semibold tracking-tight text-foreground',
                eyebrow ? 'mt-0.5' : '',
              )}
            >
              {heading}
            </span>
            {required ? (
              <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                Wymagane
              </Badge>
            ) : null}
            {highlightStatus ? <HeaderDocStatusBadge status={highlightStatus} /> : null}
          </span>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 py-4 sm:px-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface VerificationDocumentCollapsibleItemProps {
  doc: { type: string; name: string; description: string; required: boolean };
  highlightStatus?: DocHighlightStatus | null;
  children: React.ReactNode;
}

function VerificationDocumentCollapsibleItem({
  doc,
  highlightStatus = null,
  children,
}: VerificationDocumentCollapsibleItemProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-b border-border last:border-b-0"
    >
      <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 sm:px-6">
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
        <span className="flex min-w-0 flex-1 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
            {renderDocumentIcon(doc.type, 'h-4 w-4')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{doc.name}</span>
              {doc.required ? (
                <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                  Wymagane
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-medium uppercase text-muted-foreground">
                  Opcjonalne
                </Badge>
              )}
              {highlightStatus ? <HeaderDocStatusBadge status={highlightStatus} /> : null}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">{doc.description}</p>
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

interface ExistingDocChipProps {
  doc: VerificationDocumentEntry;
  review?: DocumentReview | null;
  reviewState?: DocumentReviewState;
  /**
   * When provided, renders a "Zastąp" button (or "Anuluj" while open) left of
   * "Otwórz" so the user can toggle the upload section visible without showing
   * the full dropzone by default.
   */
  onReplace?: () => void;
  /** True while the upload section for this doc is open. */
  isReplacing?: boolean;
  onRemove?: () => void;
  isRemoving?: boolean;
  /** When set, shown above the file card (e.g. approved list). */
  headingAboveFile?: string;
}

/** Status next to „Wymagane” / „Opcjonalne” in section headers. */
function HeaderDocStatusBadge({ status }: { status: DocHighlightStatus }) {
  if (status === 'attached') {
    return (
      <Badge className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
        <Check className="h-3 w-3" />
        Przesłano
      </Badge>
    );
  }
  return <ReviewBadge state={status} />;
}

function ReviewBadge({ state }: { state: DocumentReviewState }) {
  if (state === 'approved') {
    return (
      <Badge className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
        <Check className="h-3 w-3" />
        Zaakceptowany
      </Badge>
    );
  }
  if (state === 'rejected') {
    return (
      <Badge variant="destructive">
        <X className="h-3 w-3" />
        Odrzucony
      </Badge>
    );
  }
  if (state === 'stale') {
    return (
      <Badge className="border border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">
        <RefreshCw className="h-3 w-3" />
        Oczekuje na ponowną ocenę
      </Badge>
    );
  }
  return (
    <Badge className="border border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/10">
      <Clock className="h-3 w-3" />
      Oczekuje na ocenę
    </Badge>
  );
}

function ExistingDocChip({
  doc,
  review = null,
  reviewState = 'pending',
  onReplace,
  isReplacing = false,
  onRemove,
  isRemoving = false,
  headingAboveFile,
}: ExistingDocChipProps) {
  const uploadedLabel = formatDateTime(doc.uploadedAt);
  return (
    <div className="space-y-2">
      {headingAboveFile ? (
        <p className="text-sm font-semibold text-foreground">{headingAboveFile}</p>
      ) : null}
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background border">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {headingAboveFile ? 'Plik do weryfikacji' : 'Przesłany plik'}
              </span>
              {(reviewState === 'rejected' || reviewState === 'stale') && (
                <ReviewBadge state={reviewState} />
              )}
            </div>
            <div className="truncate text-sm font-medium" title={doc.filename}>
              {doc.filename}
            </div>
            {uploadedLabel && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                {uploadedLabel}
              </div>
            )}
            {doc.error && <div className="text-xs text-destructive">{doc.error}</div>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {onRemove && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRemoving}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Usuń
            </Button>
          )}
          {onReplace && (
            <Button
              type="button"
              size="sm"
              variant={isReplacing ? 'ghost' : 'default'}
              disabled={isRemoving}
              onClick={onReplace}
            >
              {isReplacing ? (
                <>
                  <X className="mr-1 h-3.5 w-3.5" /> Anuluj
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Zastąp
                </>
              )}
            </Button>
          )}
          <Button asChild size="sm" variant="outline" disabled={!doc.viewUrl}>
            {doc.viewUrl ? (
              <a href={doc.viewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Otwórz
              </a>
            ) : (
              <span>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Otwórz
              </span>
            )}
          </Button>
          <Button asChild size="sm" variant="secondary" disabled={!doc.downloadUrl}>
            {doc.downloadUrl ? (
              <a href={doc.downloadUrl} download={doc.filename}>
                <Download className="mr-1 h-3.5 w-3.5" /> Pobierz
              </a>
            ) : (
              <span>
                <Download className="mr-1 h-3.5 w-3.5" /> Pobierz
              </span>
            )}
          </Button>
        </div>
      </div>
      {reviewState === 'rejected' && review?.reason && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-destructive">
            Powód odrzucenia
          </div>
          <p className="mt-1 whitespace-pre-line text-foreground">{review.reason}</p>
        </div>
      )}
      {reviewState === 'stale' && (
        <div className="rounded-md border border-amber-500/30 bg-background p-2 text-xs text-muted-foreground">
          Plik został zaktualizowany po ostatniej ocenie. Administrator oceni go ponownie.
        </div>
      )}
    </div>
  );
}

/**
 * Mirror of the staleness rule used in the admin component: a stored review
 * stops applying once the user re-uploads the underlying file.
 */
function deriveDocumentReviewState(
  doc: VerificationDocumentEntry,
  review: DocumentReview | null | undefined
): DocumentReviewState {
  if (!review) return 'pending';
  if (doc.uploadedAt) {
    const docMs = Date.parse(doc.uploadedAt);
    const reviewMs = Date.parse(review.reviewedAt);
    if (Number.isFinite(docMs) && Number.isFinite(reviewMs) && docMs > reviewMs) {
      return 'stale';
    }
  }
  return review.status;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  initialStatus,
  existingDocuments,
  documentReviews,
  embedded = false,
  userId,
}) => {
  const { user, refreshSession } = useUserProfile();
  const router = useRouter();
  const [uploads, setUploads] = useState<Record<string, DocumentUpload>>({});
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasOcPolicyInAccount, setHasOcPolicyInAccount] = useState(false);
  const [hasCompanyKrsOrRegon, setHasCompanyKrsOrRegon] = useState(false);
  const [replaceMode, setReplaceMode] = useState<Record<string, boolean>>({});
  const [pendingDocRemovalKey, setPendingDocRemovalKey] = useState<string | null>(null);
  const [isRemovingDoc, setIsRemovingDoc] = useState(false);
  // OC validity date mirrored from /konto?tab=twoje-dane so the user
  // can complete the OC information in one place. Stored separately because
  // it lives in `contractor_account_settings`, not in the verification doc
  // payload.
  const [ocValidUntil, setOcValidUntil] = useState<string>('');
  const [initialOcValidUntil, setInitialOcValidUntil] = useState<string>('');
  const [ocGuaranteeAmount, setOcGuaranteeAmount] = useState('');
  const [initialOcGuaranteeAmount, setInitialOcGuaranteeAmount] = useState('');
  const [isSavingOcDate, setIsSavingOcDate] = useState(false);

  const isContractor = user?.userType === 'contractor';
  const useContractorDocumentSections = embedded && isContractor;
  const status = initialStatus.state;
  /** Standalone /weryfikacja page: hide upload UI once approved. Account tab always shows sections. */
  const showDocumentSections = embedded || status !== 'approved';
  const showVerificationSubmit = status !== 'approved';

  const existingByKey = useMemo(() => {
    const map: Record<string, VerificationDocumentEntry> = {};
    for (const d of existingDocuments) {
      map[d.key] = d;
    }
    return map;
  }, [existingDocuments]);

  const reviewByKey = documentReviews ?? {};

  useEffect(() => {
    if (!user?.id || !isContractor) {
      setHasOcPolicyInAccount(false);
      setHasCompanyKrsOrRegon(false);
      setOcValidUntil('');
      setInitialOcValidUntil('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const [settings, { data: company }] = await Promise.all([
          getContractorAccountSettings(user.id),
          fetchUserPrimaryCompany(supabase, user.id),
        ]);
        if (!cancelled) {
          setHasOcPolicyInAccount(Boolean(settings.ocPolicyScanPath));
          setHasCompanyKrsOrRegon(
            Boolean(company?.krs?.trim() || company?.regon?.trim()),
          );
          const dateValue = settings.ocValidUntil ?? '';
          setOcValidUntil(dateValue);
          setInitialOcValidUntil(dateValue);
          const guarantee =
            settings.ocGuaranteeAmount != null ? String(settings.ocGuaranteeAmount) : '';
          setOcGuaranteeAmount(guarantee);
          setInitialOcGuaranteeAmount(guarantee);
        }
      } catch {
        if (!cancelled) {
          setHasOcPolicyInAccount(false);
          setHasCompanyKrsOrRegon(false);
          setOcValidUntil('');
          setInitialOcValidUntil('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isContractor]);

  const handleSaveOcValidUntil = async () => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany.');
      return;
    }
    if (!ocValidUntil.trim()) {
      toast.error('Podaj datę ważności polisy OC.');
      return;
    }
    const parsedGuarantee = parseOcGuaranteeAmount(ocGuaranteeAmount);
    if (parsedGuarantee == null) {
      toast.error('Podaj prawidłową sumę gwarancyjną polisy OC (większą od zera).');
      return;
    }
    try {
      setIsSavingOcDate(true);
      const saved = await upsertContractorAccountSettings(user.id, {
        ocValidUntil,
        ocGuaranteeAmount: parsedGuarantee,
      });
      const newDate = saved.ocValidUntil ?? '';
      setOcValidUntil(newDate);
      setInitialOcValidUntil(newDate);
      const guarantee =
        saved.ocGuaranteeAmount != null ? String(saved.ocGuaranteeAmount) : '';
      setOcGuaranteeAmount(guarantee);
      setInitialOcGuaranteeAmount(guarantee);
      toast.success('Dane polisy OC zapisane');
      router.refresh();
    } catch (error) {
      console.error('Error saving OC valid until from verification page:', error);
      toast.error('Nie udało się zapisać danych polisy OC');
    } finally {
      setIsSavingOcDate(false);
    }
  };

  const ocDateDirty =
    ocValidUntil !== initialOcValidUntil || ocGuaranteeAmount !== initialOcGuaranteeAmount;

  const contractorDocuments = [
    {
      type: 'company_registration',
      name: 'Wypis z KRS/CEIDG',
      description: 'Aktualny wypis potwierdzający rejestrację firmy',
      required: true,
    },
    {
      type: 'insurance',
      name: 'Ubezpieczenie OC',
      description: 'Polisa ubezpieczenia odpowiedzialności cywilnej (ważna minimum 6 miesięcy)',
      required: true,
    },
    {
      type: 'certifications',
      name: 'Certyfikaty zawodowe',
      description: 'Skany certyfikatów i uprawnień zawodowych',
      required: false,
    },
    {
      type: 'references',
      name: 'Referencje',
      description: 'Opinie z poprzednich projektów, rekomendacje klientów',
      required: false,
    },
  ];

  const managerDocuments = [
    {
      type: 'company_registration',
      name: 'Wypis z KRS/CEIDG',
      description: 'Aktualny wypis potwierdzający rejestrację firmy zarządzającej',
      required: true,
    },
    {
      type: 'insurance',
      name: 'Ubezpieczenie OC zarządcy',
      description: 'Polisa ubezpieczenia odpowiedzialności cywilnej zarządcy',
      required: true,
    },
    {
      type: 'management_license',
      name: 'Licencja zarządcy',
      description: 'Certyfikat lub licencja zarządcy nieruchomości',
      required: false,
    },
    {
      type: 'management_contracts',
      name: 'Umowy zarządzania',
      description: 'Przykłady umów zarządzania nieruchomościami (dane osobowe zamazane)',
      required: false,
    },
  ];

  const documents = isContractor ? contractorDocuments : managerDocuments;
  /** KRS/CEIDG + OC — always two required slots for verification (admin + submit gate). */
  const verificationRequiredDocs = documents.filter(
    doc => doc.type === 'company_registration' || doc.type === 'insurance',
  );
  const visibleDocuments = useContractorDocumentSections
    ? documents.filter(doc => doc.type !== 'company_registration')
    : documents;

  const handleFileChange = (documentType: string, file: File | null) => {
    setUploads(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        file,
        type: documentType,
        required: documents.find(d => d.type === documentType)?.required || false,
      },
    }));
  };

  const handleFileDrop = (documentType: string, acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      const error = rejection.errors[0];
      if (error.code === 'file-too-large') {
        toast.error(`Plik "${rejection.file.name}" jest zbyt duży. Maksymalny rozmiar: 10MB`);
      } else if (error.code === 'file-invalid-type') {
        toast.error(`Nieprawidłowy typ pliku "${rejection.file.name}". Dozwolone: PDF, JPG, PNG`);
      } else {
        toast.error(`Błąd przy dodawaniu pliku "${rejection.file.name}": ${error.message}`);
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      handleFileChange(documentType, file);
      toast.success(`Dodano plik: ${file.name}`);
    }
  };

  const removeFile = (documentType: string) => {
    handleFileChange(documentType, null);
    toast.info('Plik usunięty');
  };

  const toggleReplace = (documentType: string) => {
    const wasOn = !!replaceMode[documentType];
    if (wasOn) {
      // Cancel: drop any pending file selection so we don't ship a stale file.
      handleFileChange(documentType, null);
    }
    setReplaceMode(prev => ({ ...prev, [documentType]: !wasOn }));
  };

  const handleConfirmRemoveStoredDocument = async () => {
    if (!pendingDocRemovalKey) return;
    const documentKey = pendingDocRemovalKey;
    setIsRemovingDoc(true);
    try {
      const result = await removeAccountVerificationDocumentAction({
        kind: 'verification',
        documentKey,
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Nie udało się usunąć dokumentu');
        return;
      }
      handleFileChange(documentKey, null);
      setReplaceMode(prev => {
        const next = { ...prev };
        delete next[documentKey];
        return next;
      });
      if (documentKey === 'insurance') {
        setHasOcPolicyInAccount(false);
      }
      toast.success(
        result.verificationReset
          ? 'Dokument usunięty. Uzupełnij dokumenty i prześlij je ponownie do weryfikacji.'
          : 'Dokument został usunięty',
      );
      setPendingDocRemovalKey(null);
      router.refresh();
    } catch (error) {
      console.error('handleConfirmRemoveStoredDocument:', error);
      toast.error('Nie udało się usunąć dokumentu');
    } finally {
      setIsRemovingDoc(false);
    }
  };

  const handleDescriptionChange = (documentType: string, description: string) => {
    setUploads(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        description,
        type: documentType,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany.');
      return;
    }
    if (isContractor && showVerificationSubmit) {
      if (!isOcPolicyDetailsComplete(ocValidUntil, ocGuaranteeAmount)) {
        toast.error('Uzupełnij ważność polisy OC i sumę gwarancyjną przed wysłaniem dokumentów.');
        return;
      }
    }
    setIsSubmitting(true);

    try {
      if (isContractor && showVerificationSubmit) {
        const parsedGuarantee = parseOcGuaranteeAmount(ocGuaranteeAmount);
        if (parsedGuarantee == null) {
          toast.error('Podaj prawidłową sumę gwarancyjną polisy OC (większą od zera).');
          return;
        }
        const saved = await upsertContractorAccountSettings(user.id, {
          ocValidUntil,
          ocGuaranteeAmount: parsedGuarantee,
        });
        const newDate = saved.ocValidUntil ?? '';
        setOcValidUntil(newDate);
        setInitialOcValidUntil(newDate);
        const guarantee =
          saved.ocGuaranteeAmount != null ? String(saved.ocGuaranteeAmount) : '';
        setOcGuaranteeAmount(guarantee);
        setInitialOcGuaranteeAmount(guarantee);
      }

      const uploadedPaths: Record<string, string> = {};

      for (const doc of documents) {
        const file = uploads[doc.type]?.file;
        if (!file) continue;

        const uploadResult = await uploadVerificationDocumentClient(doc.type, file);
        if (uploadResult.error || !uploadResult.path) {
          toast.error(uploadResult.error ?? `Nie udało się przesłać: ${doc.name}`);
          return;
        }
        uploadedPaths[doc.type] = uploadResult.path;
      }

      const result = await submitVerificationDocumentsAction(uploadedPaths);
      if (!result.ok) {
        toast.error(result.error ?? 'Nie udało się przesłać dokumentów');
        return;
      }
      toast.success(
        embedded && status === 'approved'
          ? 'Dokumenty zostały zapisane'
          : 'Dokumenty zostały przesłane do weryfikacji',
      );
      await refreshSession();
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error('Wystąpił błąd podczas przesyłania dokumentów');
    } finally {
      setIsSubmitting(false);
    }
  };

  // A required doc is "covered" if there's a new file OR a previously uploaded
  // file. Contractor OC is also covered by an OC scan stored in account settings.
  const contractorOcDetailsRequired = isContractor && showVerificationSubmit;
  const ocPolicyDetailsComplete =
    !contractorOcDetailsRequired || isOcPolicyDetailsComplete(ocValidUntil, ocGuaranteeAmount);

  const requiredDocumentsUploaded =
    ocPolicyDetailsComplete &&
    verificationRequiredDocs.every(doc =>
      isRequiredDocComplete(
        doc,
        existingByKey,
        uploads,
        isContractor,
        hasOcPolicyInAccount,
        hasCompanyKrsOrRegon,
      ),
    );

  const requiredSlotsTotal =
    verificationRequiredDocs.length + (contractorOcDetailsRequired ? 1 : 0);
  const requiredCompleteCount =
    verificationRequiredDocs.filter(doc =>
      isRequiredDocComplete(
        doc,
        existingByKey,
        uploads,
        isContractor,
        hasOcPolicyInAccount,
        hasCompanyKrsOrRegon,
      ),
    ).length + (contractorOcDetailsRequired && ocPolicyDetailsComplete ? 1 : 0);
  const requiredProgressPct =
    requiredSlotsTotal > 0
      ? Math.round((requiredCompleteCount / requiredSlotsTotal) * 100)
      : 100;

  const newUploadsCount = documents.reduce(
    (count, doc) => count + (uploads[doc.type]?.file ? 1 : 0),
    0
  );

  const hasDocumentFormChanges = newUploadsCount > 0 || ocDateDirty;
  const isAwaitingVerificationWithNoChanges =
    status === 'pending' && !hasDocumentFormChanges;

  const showOptionalSave = embedded && status === 'approved' && newUploadsCount > 0;

  const submitLabel = (() => {
    if (isAwaitingVerificationWithNoChanges) {
      return 'Czeka na weryfikację';
    }
    if (embedded && status === 'approved') {
      return 'Zapisz dokumenty';
    }
    if (status === 'rejected') {
      return newUploadsCount > 0 ? 'Prześlij ponownie' : 'Wyślij ponownie do weryfikacji';
    }
    if (existingDocuments.length > 0 && newUploadsCount > 0) {
      return 'Zapisz zmiany i wyślij';
    }
    return 'Prześlij dokumenty';
  })();

  const headerSubtitle =
    status === 'approved'
      ? 'Twoje konto jest zweryfikowane'
      : status === 'pending'
        ? 'Oczekujemy na decyzję moderatora'
        : status === 'rejected'
          ? 'Weryfikacja została odrzucona — możesz przesłać dokumenty ponownie'
          : 'Prześlij dokumenty aby zweryfikować swoje konto';

  const getDocHighlightStatus = (
    doc: { type: string; required: boolean },
  ): DocHighlightStatus | null =>
    resolveDocHighlightStatus(
      doc,
      existingByKey,
      uploads,
      reviewByKey,
      isContractor,
      hasOcPolicyInAccount,
      hasCompanyKrsOrRegon,
    );

  const renderContractorDocumentRow = (
    doc: { type: string; name: string; description: string; required: boolean },
    options?: { nestedInSectionShell?: boolean; hideHeader?: boolean },
  ) => {
    const existing = existingByKey[doc.type];
    const newFile = uploads[doc.type]?.file ?? null;
    const willReplace = Boolean(existing && newFile);
    const review = existing ? reviewByKey[existing.key] ?? null : null;
    const reviewState = existing ? deriveDocumentReviewState(existing, review) : 'pending';
    const isReplacing = !!replaceMode[doc.type];
    const showUploadSection = !existing || isReplacing;

    const hideHeader = options?.hideHeader ?? false;

    return (
      <section
        key={doc.type}
        id={doc.type === 'insurance' && isContractor && !hideHeader ? 'oc-policy' : undefined}
        className={cn(
          reviewState === 'rejected' && 'bg-destructive/[0.03]',
          reviewState === 'approved' && existing && doc.required && 'bg-emerald-500/[0.03]',
        )}
      >
        {hideHeader ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {willReplace && (
              <Badge className="border border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">
                <RefreshCw className="h-3 w-3" />
                Do zastąpienia
              </Badge>
            )}
          </div>
        ) : null}

        <div className="space-y-4">
          {existing && (
            <ExistingDocChip
              doc={existing}
              review={review}
              reviewState={reviewState}
              onReplace={() => toggleReplace(doc.type)}
              isReplacing={isReplacing}
              onRemove={() => setPendingDocRemovalKey(doc.type)}
              isRemoving={isRemovingDoc && pendingDocRemovalKey === doc.type}
            />
          )}

          {doc.type === 'insurance' && isContractor && (
            <>
              {options?.nestedInSectionShell ? (
                <h4 className="text-sm font-semibold text-foreground">
                  Termin ważności polisy i suma gwarancyjna
                </h4>
              ) : null}
              <div
                className={cn(
                  'rounded-lg border border-dashed border-border/80 bg-muted/15 p-3 sm:p-4 space-y-4',
                  options?.nestedInSectionShell && 'mt-2',
                )}
              >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label
                    htmlFor="oc-valid-until-verification"
                    className="flex items-center gap-1.5 text-xs font-medium"
                  >
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Ważność polisy do
                    {showVerificationSubmit ? (
                      <span className="text-destructive" aria-hidden>
                        *
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id="oc-valid-until-verification"
                    type="date"
                    value={ocValidUntil}
                    onChange={e => setOcValidUntil(e.target.value)}
                    disabled={isSavingOcDate}
                    required={showVerificationSubmit}
                    aria-required={showVerificationSubmit}
                    className="max-w-xs bg-background"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="oc-guarantee-amount" className="text-xs font-medium">
                    Suma gwarancyjna polisy (zł)
                    {showVerificationSubmit ? (
                      <span className="text-destructive" aria-hidden>
                        {' '}
                        *
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id="oc-guarantee-amount"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="np. 200000"
                    value={ocGuaranteeAmount}
                    onChange={e => setOcGuaranteeAmount(e.target.value)}
                    disabled={isSavingOcDate}
                    required={showVerificationSubmit}
                    aria-required={showVerificationSubmit}
                    className="max-w-xs bg-background"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={ocDateDirty ? 'default' : 'outline'}
                  disabled={!ocDateDirty || isSavingOcDate}
                  onClick={handleSaveOcValidUntil}
                  className="shrink-0"
                >
                  {isSavingOcDate ? 'Zapisywanie...' : 'Zapisz dane OC'}
                </Button>
              </div>
            </div>
            </>
          )}

          {showUploadSection && (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-3 sm:p-4 overflow-hidden">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden">
                  <Label className="text-xs font-medium text-foreground">{`Plik — ${doc.name}`}</Label>
                  <Dropzone
                    accept={{
                      'application/pdf': ['.pdf'],
                      'image/*': ['.jpg', '.jpeg', '.png'],
                    }}
                    maxFiles={1}
                    maxSize={10 * 1024 * 1024}
                    minSize={1024}
                    onDrop={(acceptedFiles, fileRejections) =>
                      handleFileDrop(doc.type, acceptedFiles, fileRejections)
                    }
                    disabled={isSubmitting}
                    src={newFile ? [newFile] : []}
                    className="!h-[5.5rem] !max-h-[5.5rem] !min-h-0 w-full !p-3 shrink-0"
                  >
                    <DropzoneEmptyState>
                      <div className="flex flex-col items-center justify-center gap-1 py-1">
                        <div className="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Upload className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-xs font-medium text-center">
                          Przeciągnij lub kliknij, aby wybrać plik
                        </p>
                        <p className="text-[11px] text-muted-foreground text-center">
                          PDF, JPG, PNG · max 10 MB
                        </p>
                      </div>
                    </DropzoneEmptyState>
                    <DropzoneContent>
                      {newFile && (
                        <div className="flex w-full flex-col items-center justify-center gap-0.5 py-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="max-w-[140px] truncate text-xs font-medium sm:max-w-[180px]">
                              {newFile.name}
                            </span>
                            <Check className="h-3.5 w-3.5 text-success" />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {formatFileSize(newFile.size)} · kliknij, aby zmienić
                          </p>
                        </div>
                      )}
                    </DropzoneContent>
                  </Dropzone>
                  {newFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(doc.type)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Usuń wybrany plik
                    </Button>
                  )}
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor={`desc-${doc.type}`} className="text-xs font-medium">
                    Komentarz (opcjonalnie)
                  </Label>
                  <Textarea
                    id={`desc-${doc.type}`}
                    placeholder="Np. zakres uprawnień, numer polisy..."
                    value={uploads[doc.type]?.description || ''}
                    onChange={e => handleDescriptionChange(doc.type, e.target.value)}
                    className="h-[5.5rem] min-h-[5.5rem] max-h-40 resize-y bg-background"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  const content = (
    <>
    <div className={embedded ? 'space-y-6' : 'max-w-4xl mx-auto px-4 py-8'}>
        <div className="space-y-6">
          {/* State banner — skip duplicate unsubmitted prompt in account tab */}
          {!(embedded && status === 'unsubmitted') && (
            <VerificationStateBanner
              status={initialStatus}
              onAction={
                status === 'approved' && !embedded
                  ? () => router.push('/konto')
                  : undefined
              }
            />
          )}

          {/* Approved: read-only documents list */}
          {status === 'approved' && existingDocuments.length > 0 && !embedded && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Twoje dokumenty weryfikacyjne</CardTitle>
                <CardDescription>
                  Dokumenty zatwierdzone przez administratora podczas weryfikacji konta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {existingDocuments.map(doc => {
                  const review = reviewByKey[doc.key] ?? null;
                  return (
                    <ExistingDocChip
                      key={doc.key}
                      doc={doc}
                      review={review}
                      reviewState={deriveDocumentReviewState(doc, review)}
                      headingAboveFile={doc.label}
                      onRemove={
                        embedded ? () => setPendingDocRemovalKey(doc.key) : undefined
                      }
                      isRemoving={isRemovingDoc && pendingDocRemovalKey === doc.key}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}

          {!showDocumentSections && !embedded && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-primary">
                      Weryfikacja konta {isContractor ? 'wykonawcy' : 'zarządcy'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Zweryfikowane konto otrzymuje więcej {isContractor ? 'zgłoszeń' : 'ofert'} i
                      wyższą pozycję w wynikach wyszukiwania.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {showDocumentSections && (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="border-b bg-muted/30 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold tracking-tight">
                        {status === 'approved' && embedded
                          ? 'Dokumenty i załączniki'
                          : existingDocuments.length > 0
                            ? 'Twoje dokumenty weryfikacyjne'
                            : 'Dokumenty do weryfikacji'}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {status === 'approved' && embedded
                          ? 'Konto jest zweryfikowane. Uzupełnij wymagane zaświadczenia w pierwszej sekcji oraz opcjonalne dokumenty w drugiej.'
                          : useContractorDocumentSections
                            ? 'Uzupełnij dokumenty wymagane do weryfikacji, a następnie — opcjonalnie — certyfikaty i referencje. Weryfikacja jest bezpłatna i trwa zwykle 1–3 dni robocze.'
                            : 'Zweryfikowane konto buduje zaufanie i poprawia widoczność w wynikach. Weryfikacja jest bezpłatna i trwa zwykle 1–3 dni robocze.'}
                      </p>
                      {existingDocuments.length > 0 && !(status === 'approved' && embedded) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Użyj „Zastąp”, aby wymienić plik w wybranym polu.
                        </p>
                      )}
                    </div>
                  </div>
                  {showVerificationSubmit ? (
                    <div className="w-full shrink-0 lg:w-52">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">Wymagane dokumenty</span>
                        <span className="tabular-nums font-semibold text-foreground">
                          {requiredCompleteCount}/{requiredSlotsTotal}
                        </span>
                      </div>
                      <div
                        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={requiredProgressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-300',
                            requiredDocumentsUploaded ? 'bg-emerald-500' : 'bg-primary',
                          )}
                          style={{ width: `${requiredProgressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {showVerificationSubmit &&
              (() => {
                const rejectedCount = existingDocuments.filter(d => {
                  const r = reviewByKey[d.key] ?? null;
                  return deriveDocumentReviewState(d, r) === 'rejected';
                }).length;
                if (rejectedCount === 0) return null;
                return (
                  <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 sm:px-6">
                    <Alert variant="destructive" className="border-0 bg-transparent p-0 shadow-none">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {rejectedCount === 1
                          ? 'Jeden dokument został odrzucony — zastąp go i wyślij ponownie.'
                          : `${rejectedCount} dokumentów odrzuconych — zastąp je i wyślij ponownie.`}
                      </AlertDescription>
                    </Alert>
                  </div>
                );
              })()}

              <div
                className={cn(
                  useContractorDocumentSections && 'space-y-6',
                )}
              >
                {useContractorDocumentSections && userId ? (
                  <>
                    <DocumentsSectionGroup
                      variant="required"
                      heading="Dokumenty wymagane do weryfikacji"
                      description="KRS/CEIDG, polisa OC i zaświadczenia urzędowe — potrzebne do zatwierdzenia konta."
                    >
                      {documents
                        .filter(doc => doc.type === 'company_registration')
                        .map(doc => (
                          <DocumentsCollapsibleSection
                            key={doc.type}
                            heading={doc.name}
                            description={doc.description}
                            required
                            highlightStatus={getDocHighlightStatus(doc)}
                          >
                            {renderContractorDocumentRow(doc, {
                              nestedInSectionShell: true,
                              hideHeader: true,
                            })}
                          </DocumentsCollapsibleSection>
                        ))}
                      <DocumentsCollapsibleSection
                        heading="Polisa OC (odpowiedzialność cywilna)"
                        id="oc-policy"
                        required
                        highlightStatus={getDocHighlightStatus(
                          documents.find(d => d.type === 'insurance') ?? {
                            type: 'insurance',
                            required: true,
                          },
                        )}
                      >
                        {visibleDocuments
                          .filter(doc => doc.type === 'insurance')
                          .map(doc =>
                            renderContractorDocumentRow(doc, {
                              nestedInSectionShell: true,
                              hideHeader: true,
                            }),
                          )}
                      </DocumentsCollapsibleSection>
                      <DocumentsCollapsibleSection
                        heading="Zaświadczenia urzędowe: ZUS i US"
                        description="Zarządcy wymagają dokumentów nie starszych niż 3 miesiące."
                      >
                        <ContractorOfficialCertificatesSettings userId={userId} />
                      </DocumentsCollapsibleSection>
                    </DocumentsSectionGroup>
                    <DocumentsSectionGroup
                      variant="optional"
                      heading="Dokumenty opcjonalne"
                      description="Certyfikaty, referencje i dodatkowe załączniki — zwiększają wiarygodność, ale nie blokują weryfikacji konta."
                    >
                      <DocumentsCollapsibleSection
                        heading="Certyfikaty i zadeklarowane uprawnienia"
                        highlightStatus={getDocHighlightStatus(
                          documents.find(d => d.type === 'certifications') ?? {
                            type: 'certifications',
                            required: false,
                          },
                        )}
                      >
                        {visibleDocuments
                          .filter(doc => doc.type === 'certifications')
                          .map(doc =>
                            renderContractorDocumentRow(doc, {
                              nestedInSectionShell: true,
                              hideHeader: true,
                            }),
                          )}
                        <div className="mt-6 space-y-3 border-t border-border pt-5">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Typy uprawnień w profilu
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Zaznacz kategorie zgodne z dokumentami i zapisz listę — ułatwia to
                              weryfikację.
                            </p>
                          </div>
                          <ContractorProfessionalQualificationsChecklist userId={userId} />
                        </div>
                      </DocumentsCollapsibleSection>
                      <DocumentsCollapsibleSection
                        heading="Referencje i dodatkowy skan kwalifikacji"
                        highlightStatus={getDocHighlightStatus(
                          documents.find(d => d.type === 'references') ?? {
                            type: 'references',
                            required: false,
                          },
                        )}
                      >
                        {visibleDocuments
                          .filter(doc => doc.type === 'references')
                          .map(doc =>
                            renderContractorDocumentRow(doc, {
                              nestedInSectionShell: true,
                              hideHeader: true,
                            }),
                          )}
                        <div className="mt-6 space-y-3 border-t border-border pt-5">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Skan certyfikatu lub licencji (opcjonalnie)
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Osobny plik uzupełniający certyfikaty powyżej — np. skan licencji
                              branżowej.
                            </p>
                          </div>
                          <ContractorProfessionalQualificationsSettings
                            userId={userId}
                            variant="section"
                            hideSectionChrome
                          />
                        </div>
                      </DocumentsCollapsibleSection>
                    </DocumentsSectionGroup>
                  </>
                ) : (
                  visibleDocuments.map(doc => (
                    <VerificationDocumentCollapsibleItem
                      key={doc.type}
                      doc={doc}
                      highlightStatus={getDocHighlightStatus(doc)}
                    >
                      <div className="px-4 py-4 sm:px-6">
                        {renderContractorDocumentRow(doc, { hideHeader: true })}
                      </div>
                    </VerificationDocumentCollapsibleItem>
                  ))
                )}
              </div>

              {(showVerificationSubmit || showOptionalSave) && (
              <div className="space-y-4 border-t bg-muted/20 px-4 py-5 sm:px-6">
                {showVerificationSubmit ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="verification-additional-info" className="text-sm font-medium">
                        Uwagi do całego wniosku (opcjonalnie)
                      </Label>
                      <Textarea
                        id="verification-additional-info"
                        value={additionalInfo}
                        onChange={e => setAdditionalInfo(e.target.value)}
                        placeholder="Doświadczenie, dodatkowe kwalifikacje lub kontekst pomocny przy weryfikacji..."
                        rows={3}
                        className="bg-background"
                      />
                    </div>

                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 sm:p-4">
                      <p className="text-xs font-semibold text-amber-900">Przed wysłaniem</p>
                      <ul className="mt-2 space-y-1 text-xs text-amber-900/90">
                        {useContractorDocumentSections && (
                          <>
                            <li>· Uzupełnij datę ważności polisy OC i sumę gwarancyjną</li>
                            <li>· Dokumenty urzędowe (ZUS, US) nie starsze niż 3 miesiące</li>
                          </>
                        )}
                        <li>· Dokumenty aktualne (nie starsze niż 6 miesięcy) i czytelne</li>
                        <li>· Do dokumentów obcojęzycznych dołącz tłumaczenie</li>
                        <li className="font-medium">
                          · Fałszywe dokumenty skutkują trwałym zablokowaniem konta
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-lg border bg-background/80 p-3 text-xs leading-relaxed text-muted-foreground">
                      <Info className="mb-1 inline h-3.5 w-3.5 text-primary" />{' '}
                      <strong className="text-foreground">RODO:</strong> dokumenty przetwarzamy wyłącznie
                      w celu weryfikacji (art. 6 ust. 1 lit. f RODO), przechowujemy bezpiecznie i
                      usuwamy po zakończeniu procesu.{' '}
                      <Link href="/polityka-prywatnosci" className="font-medium text-primary hover:underline">
                        Polityka prywatności
                      </Link>
                    </div>
                  </>
                ) : null}

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
                  {!embedded && showVerificationSubmit && (
                    <Button variant="outline" onClick={() => router.push('/konto')}>
                      Anuluj
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      showVerificationSubmit
                        ? isAwaitingVerificationWithNoChanges ||
                          !requiredDocumentsUploaded ||
                          isSubmitting
                        : isSubmitting
                    }
                    className="w-full sm:min-w-40 sm:w-auto"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Przesyłanie...</span>
                      </div>
                    ) : (
                      <>
                        {isAwaitingVerificationWithNoChanges ? (
                          <Clock className="mr-2 h-4 w-4" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {submitLabel}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
    </div>
      <DocumentRemovalAlertDialog
        open={pendingDocRemovalKey !== null}
        onOpenChange={open => {
          if (!open && !isRemovingDoc) setPendingDocRemovalKey(null);
        }}
        onConfirm={handleConfirmRemoveStoredDocument}
        isPending={isRemovingDoc}
      />
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/konto')}
              className="hidden md:flex text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót
            </Button>
            <div>
              <h1>Weryfikacja konta</h1>
              <p className="text-sm text-muted-foreground">{headerSubtitle}</p>
            </div>
          </div>
        </div>
      </div>
      {content}
    </div>
  );
};
