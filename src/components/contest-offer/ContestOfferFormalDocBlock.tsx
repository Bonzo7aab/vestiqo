'use client';

import Link from 'next/link';
import { type ReactElement } from 'react';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { ExternalLink, FileText, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import type {
  ContestOfferAttachmentRef,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import { CONTRACTOR_VERIFICATION_DOCUMENTS_PATH } from '../../lib/verification/documents-route';
import { supportsContestOfferProfileAutofill } from '../../lib/contest-offer/build-profile-formal-attachment';
import {
  OFFER_DOCUMENT_MAX_BYTES,
  OFFER_FORMAL_DOCUMENT_ACCEPT,
  contestOfferDocumentRejectionMessage,
  formatContestFileSize,
} from '../../lib/contest-offer/contest-offer-form-documents';
import { ContestOfferFieldError, ContestOfferRequiredLabel } from './ContestOfferFieldError';
import { cn } from '../ui/utils';

export const contestOfferUploadedFileRowClass =
  'flex items-center justify-between gap-3 rounded-lg border-2 border-primary/25 bg-primary/5 px-3.5 py-3 text-sm shadow-sm dark:bg-primary/10';

export const contestOfferStagedFileRowClass =
  'flex items-center justify-between gap-3 rounded-lg border-2 border-primary/25 bg-primary/5 px-3.5 py-3 text-sm shadow-sm dark:bg-primary/10';

export const contestOfferFileIconWrapClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary';

export const contestOfferSectionCardClass =
  'rounded-lg border border-border/60 bg-white p-4 shadow-sm dark:bg-card';

export const contestOfferSectionIconClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground';

interface ContestOfferFormalDocBlockProps {
  doc: ResolvedContractorDocument;
  attached?: ContestOfferAttachmentRef;
  stagedName?: string;
  stagedSize?: number;
  fieldError?: string;
  onUseProfile: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onFileIssue?: (message: string | null) => void;
}

export function ContestOfferFormalDocBlock({
  doc,
  attached,
  stagedName,
  stagedSize,
  fieldError,
  onUseProfile,
  onUpload,
  onRemove,
  onFileIssue,
}: ContestOfferFormalDocBlockProps): ReactElement {
  const displayName = stagedName ?? attached?.name;
  const isAttached = Boolean(displayName);
  const isStaged = Boolean(stagedName);
  const previewUrl = isStaged ? undefined : attached?.url;
  const showProfileOptions = supportsContestOfferProfileAutofill(doc.requirementKey);
  const showProfileCta = showProfileOptions && (doc.missing || doc.profileBlocked);
  const displaySize = isStaged ? stagedSize : attached?.size;

  const handleDrop = (accepted: File[], rejections: FileRejection[]): void => {
    if (rejections.length > 0) {
      const firstRejection = rejections[0];
      const message = firstRejection
        ? contestOfferDocumentRejectionMessage(firstRejection, 'formal')
        : 'Nieprawidłowy plik';
      toast.error(message);
      onFileIssue?.(message);
    }

    const file = accepted[0];
    if (file) {
      onUpload(file);
      if (rejections.length === 0) {
        onFileIssue?.(null);
      }
    }
  };

  return (
    <div
      data-contest-offer-formal={doc.requirementKey}
      className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0"
    >
      <div>
        <ContestOfferRequiredLabel>{doc.label}</ContestOfferRequiredLabel>
        {doc.hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{doc.hint}</p>
        ) : null}

        {showProfileCta && !isAttached && doc.missing ? (
          <p className="mb-3 mt-1 text-sm text-muted-foreground">
            Brak tego dokumentu w profilu.{' '}
            <Link
              href={CONTRACTOR_VERIFICATION_DOCUMENTS_PATH}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Uzupełnij w profilu
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        ) : null}

        {showProfileCta && (isAttached || !doc.missing) && doc.profileBlocked ? (
          <p className="mb-3 mt-1 text-sm text-muted-foreground">
            Wymagania konkursu nie zgadzają się z profilem.{' '}
            <Link
              href={CONTRACTOR_VERIFICATION_DOCUMENTS_PATH}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Uzupełnij w profilu
              <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        ) : null}

        {!isAttached && showProfileOptions && !doc.missing ? (
          <div className="mb-3 mt-1 space-y-2 text-sm text-muted-foreground">
            <p>W profilu masz: {doc.fileName}</p>
            <div className="flex flex-wrap items-center gap-2">
              {doc.signedUrl ? (
                <Link
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Podgląd w profilu
                </Link>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={onUseProfile}>
                Użyj z profilu
              </Button>
            </div>
          </div>
        ) : null}

        {isAttached ? (
          <ul className="mb-3 space-y-2">
            <li className={isStaged ? contestOfferStagedFileRowClass : contestOfferUploadedFileRowClass}>
              <span className="flex min-w-0 items-center gap-3">
                <span className={contestOfferFileIconWrapClass} aria-hidden>
                  {isStaged ? (
                    <Upload className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{displayName}</span>
                  {isStaged ? (
                    <span className="text-xs text-muted-foreground">
                      {displaySize != null && displaySize > 0
                        ? `${formatContestFileSize(displaySize)} — nowy plik, zostanie wysłany przy zapisie`
                        : 'Nowy plik — zostanie wysłany przy zapisie'}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {displaySize != null && displaySize > 0
                        ? `${formatContestFileSize(displaySize)} — dołączony do oferty`
                        : 'Dołączony do oferty'}
                    </span>
                  )}
                </span>
                {previewUrl ? (
                  <Link
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Podgląd
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : null}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={`Usuń ${displayName}`}
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          </ul>
        ) : null}

        <Dropzone
          accept={OFFER_FORMAL_DOCUMENT_ACCEPT}
          maxFiles={1}
          minSize={1}
          maxSize={OFFER_DOCUMENT_MAX_BYTES}
          onDrop={handleDrop}
          className={cn(
            'min-h-[100px] border-dashed p-5',
            isAttached && 'min-h-[72px]',
            fieldError && 'border-destructive',
          )}
        >
          <DropzoneEmptyState>
            <p className="text-sm font-medium">
              {isAttached ? 'Zastąp plik — przeciągnij lub kliknij' : 'Przeciągnij plik tutaj lub kliknij, aby wybrać'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, DOCX lub obrazy — max 10&nbsp;MB
            </p>
          </DropzoneEmptyState>
          <DropzoneContent />
        </Dropzone>
        <ContestOfferFieldError message={fieldError} />
      </div>
    </div>
  );
}
