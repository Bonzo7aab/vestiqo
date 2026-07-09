'use client';

import Link from 'next/link';
import { type ReactElement } from 'react';
import { ExternalLink, FileText, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import type {
  ContestOfferAttachmentRef,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import { CONTRACTOR_VERIFICATION_DOCUMENTS_PATH } from '../../lib/verification/documents-route';
import { supportsContestOfferProfileAutofill } from '../../lib/contest-offer/build-profile-formal-attachment';
import { ContestOfferFieldError, ContestOfferRequiredLabel } from './ContestOfferFieldError';
import { cn } from '../ui/utils';

export const contestOfferUploadedFileRowClass =
  'flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-white px-3 py-2.5 text-sm shadow-sm dark:bg-card';

export const contestOfferStagedFileRowClass =
  'flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-white px-3 py-2.5 text-sm text-muted-foreground shadow-sm dark:bg-card';

export const contestOfferSectionCardClass =
  'rounded-lg border border-border/60 bg-white p-4 shadow-sm dark:bg-card';

export const contestOfferSectionIconClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30 text-muted-foreground';

const FILE_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
} as const;

interface ContestOfferFormalDocBlockProps {
  doc: ResolvedContractorDocument;
  attached?: ContestOfferAttachmentRef;
  stagedName?: string;
  fieldError?: string;
  onUseProfile: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function ContestOfferFormalDocBlock({
  doc,
  attached,
  stagedName,
  fieldError,
  onUseProfile,
  onUpload,
  onRemove,
}: ContestOfferFormalDocBlockProps): ReactElement {
  const displayName = stagedName ?? attached?.name;
  const isAttached = Boolean(displayName);
  const isStaged = Boolean(stagedName);
  const previewUrl = isStaged ? undefined : attached?.url;
  const showProfileOptions = supportsContestOfferProfileAutofill(doc.requirementKey);

  return (
    <div
      data-contest-offer-formal={doc.requirementKey}
      className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0"
    >
      <div>
        <ContestOfferRequiredLabel>{doc.label}</ContestOfferRequiredLabel>

        {!isAttached && showProfileOptions && doc.missing ? (
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

        <Dropzone
          accept={FILE_ACCEPT}
          maxFiles={1}
          onDrop={(files) => {
            const file = files[0];
            if (file) onUpload(file);
          }}
          className={cn('min-h-[140px] border-dashed', fieldError && 'border-destructive')}
        >
          <DropzoneEmptyState>
            <p className="text-sm font-medium">Przeciągnij plik tutaj lub kliknij, aby wybrać</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX lub obrazy</p>
          </DropzoneEmptyState>
          <DropzoneContent />
        </Dropzone>
        <ContestOfferFieldError message={fieldError} />
      </div>

      {isAttached ? (
        <ul className="space-y-2">
          <li className={isStaged ? contestOfferStagedFileRowClass : contestOfferUploadedFileRowClass}>
            <span className="flex min-w-0 items-center gap-2">
              {isStaged ? (
                <Upload className="h-4 w-4 shrink-0" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">
                {isStaged ? `Do wgrania przy zapisie: ${displayName}` : displayName}
              </span>
              {previewUrl ? (
                <Link
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
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
    </div>
  );
}
