'use client';

import { type ReactElement } from 'react';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { FileText, Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import type { ContestOfferAttachmentRef } from '../../types/contest-offer';
import type { OfferDocumentRequirement } from '../../types/tender-contest';
import {
  OFFER_DOCUMENT_MAX_BYTES,
  OFFER_DOCUMENTATION_ACCEPT,
  contestOfferDocumentRejectionMessage,
  formatContestFileSize,
} from '../../lib/contest-offer/contest-offer-form-documents';
import { ContestOfferFieldError, ContestOfferRequiredLabel } from './ContestOfferFieldError';
import {
  contestOfferFileIconWrapClass,
  contestOfferStagedFileRowClass,
  contestOfferUploadedFileRowClass,
} from './ContestOfferFormalDocBlock';
import { cn } from '../ui/utils';

interface ContestOfferNamedDocumentBlockProps {
  document: OfferDocumentRequirement;
  attached?: ContestOfferAttachmentRef;
  stagedName?: string;
  stagedSize?: number;
  fieldError?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onFileIssue?: (message: string | null) => void;
}

export function ContestOfferNamedDocumentBlock({
  document,
  attached,
  stagedName,
  stagedSize,
  fieldError,
  onUpload,
  onRemove,
  onFileIssue,
}: ContestOfferNamedDocumentBlockProps): ReactElement {
  const displayName = stagedName ?? attached?.name;
  const isAttached = Boolean(displayName);
  const isStaged = Boolean(stagedName);
  const displaySize = isStaged ? stagedSize : attached?.size;

  const handleDrop = (accepted: File[], rejections: FileRejection[]): void => {
    if (rejections.length > 0) {
      const firstRejection = rejections[0];
      const message = firstRejection
        ? contestOfferDocumentRejectionMessage(firstRejection, 'offerDocumentation')
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
      data-contest-offer-document={document.id}
      className="space-y-3 border-b pb-6 last:border-b-0 last:pb-0"
    >
      <div>
        <ContestOfferRequiredLabel>{document.name}</ContestOfferRequiredLabel>
        <p className="mt-1 text-xs text-muted-foreground">
          Wgraj wymagany dokument oferty.
        </p>

        {isAttached ? (
          <ul className="mb-3 mt-3 space-y-2">
            <li className={isStaged ? contestOfferStagedFileRowClass : contestOfferUploadedFileRowClass}>
              <span className="flex min-w-0 items-center gap-3">
                <span className={contestOfferFileIconWrapClass} aria-hidden>
                  {isStaged ? <Upload className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
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
          accept={OFFER_DOCUMENTATION_ACCEPT}
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
              {isAttached
                ? 'Zastąp plik — przeciągnij lub kliknij'
                : 'Przeciągnij plik tutaj lub kliknij, aby wybrać'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, DOCX, XLS, XLSX lub obrazy — max 10&nbsp;MB
            </p>
          </DropzoneEmptyState>
          <DropzoneContent />
        </Dropzone>
        <ContestOfferFieldError message={fieldError} />
      </div>
    </div>
  );
}
