'use client';

import { type ReactElement } from 'react';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { ContestOfferFormData } from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/contest-offer/offer-form-validation';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import { ContestOfferFieldError, ContestOfferRequiredLabel } from './ContestOfferFieldError';
import {
  contestOfferFileIconWrapClass,
  contestOfferStagedFileRowClass,
  contestOfferUploadedFileRowClass,
} from './ContestOfferFormalDocBlock';
import { cn } from '../ui/utils';
import {
  OFFER_DOCUMENTATION_ACCEPT,
  OFFER_DOCUMENT_MAX_BYTES,
  OFFER_DOCUMENT_MAX_FILES,
  contestOfferDocumentCapMessage,
  contestOfferDocumentRejectionMessage,
  contestOfferDocumentTruncateWarning,
  formatContestFileSize,
  remainingOfferDocumentSlots,
  takeAcceptedContestFiles,
} from '../../lib/contest-offer/contest-offer-form-documents';

interface ContestOfferStepBasicProps {
  form: ContestOfferFormData;
  onStageFiles: (files: File[]) => void;
  onRemoveExtra: (id: string) => void;
  onRemoveStaged: (index: number) => void;
  onFileIssue?: (message: string | null) => void;
  fieldErrors?: Pick<ContestOfferFieldErrors, 'offerDocumentation'>;
}

export function ContestOfferStepBasic({
  form,
  onStageFiles,
  onRemoveExtra,
  onRemoveStaged,
  onFileIssue,
  fieldErrors,
}: ContestOfferStepBasicProps): ReactElement {
  const offerDocs = form.extraAttachments.filter((a) => a.requirementKey === 'offerDocumentation');
  const stagedFiles = form.stagedFiles.offerDocumentation ?? [];
  const totalFiles = offerDocs.length + stagedFiles.length;
  const remainingSlots = remainingOfferDocumentSlots(stagedFiles.length, offerDocs.length);
  const dropzoneDisabled = remainingSlots <= 0;
  const hasFiles = totalFiles > 0;
  const hasError = Boolean(fieldErrors?.offerDocumentation);

  const handleDrop = (accepted: File[], rejections: FileRejection[]): void => {
    let keepError = false;

    if (rejections.length > 0) {
      const firstRejection = rejections[0];
      const message = firstRejection
        ? contestOfferDocumentRejectionMessage(firstRejection, 'offerDocumentation')
        : 'Nieprawidłowy plik';
      toast.error(message);
      onFileIssue?.(message);
      keepError = true;
    }

    if (accepted.length === 0) {
      return;
    }

    if (remainingSlots <= 0) {
      const message = contestOfferDocumentCapMessage();
      toast.error(message);
      onFileIssue?.(message);
      return;
    }

    const { filesToAdd, truncated } = takeAcceptedContestFiles(accepted, remainingSlots);
    if (filesToAdd.length > 0) {
      onStageFiles(filesToAdd);
    }

    if (truncated) {
      const warning = contestOfferDocumentTruncateWarning(filesToAdd.length, accepted.length);
      toast.warning(warning);
      if (!keepError) {
        onFileIssue?.(warning);
      }
    } else if (!keepError) {
      onFileIssue?.(null);
    }
  };

  return (
    <div className="space-y-4" id="contest-offer-offerDocumentation">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <ContestOfferRequiredLabel>Dokumentacja ofertowa</ContestOfferRequiredLabel>
          <span className="text-xs tabular-nums text-muted-foreground">
            {totalFiles}/{OFFER_DOCUMENT_MAX_FILES}
          </span>
        </div>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Dodaj pliki oferty — kosztorys, opis techniczny, załączniki wymagane w konkursie.
        </p>

        {hasFiles ? (
          <ul className="mb-3 space-y-2">
            {offerDocs.map((att, index) => (
              <li
                key={att.path ? `path-${att.path}` : `${att.id}-${index}`}
                className={contestOfferUploadedFileRowClass}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={contestOfferFileIconWrapClass} aria-hidden>
                    <span className="text-sm font-semibold tabular-nums">{index + 1}.</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{att.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {att.size != null && att.size > 0
                        ? `${formatContestFileSize(att.size)} — dołączony do oferty`
                        : 'Dołączony do oferty'}
                    </span>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Usuń ${att.name}`}
                  onClick={() => onRemoveExtra(att.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
            {stagedFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className={contestOfferStagedFileRowClass}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={contestOfferFileIconWrapClass} aria-hidden>
                    <span className="text-sm font-semibold tabular-nums">
                      {offerDocs.length + index + 1}.
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatContestFileSize(file.size)} — nowy plik, zostanie wysłany przy zapisie
                    </span>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Usuń ${file.name}`}
                  onClick={() => onRemoveStaged(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <Dropzone
          accept={OFFER_DOCUMENTATION_ACCEPT}
          maxFiles={0}
          minSize={1}
          maxSize={OFFER_DOCUMENT_MAX_BYTES}
          disabled={dropzoneDisabled}
          onDrop={handleDrop}
          className={cn(
            'min-h-[140px] border-dashed p-5',
            hasFiles && 'min-h-[88px]',
            hasError && 'border-destructive',
          )}
        >
          <DropzoneEmptyState>
            <p className="text-sm font-medium">
              {dropzoneDisabled
                ? 'Osiągnięto limit plików'
                : hasFiles
                  ? 'Dodaj kolejne pliki — przeciągnij lub kliknij'
                  : 'Przeciągnij pliki tutaj lub kliknij, aby wybrać'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dropzoneDisabled
                ? `Maksymalnie ${OFFER_DOCUMENT_MAX_FILES} plików łącznie.`
                : `PDF, DOC, DOCX, XLS, XLSX lub obrazy — max 10\u00a0MB każdy, maks. ${OFFER_DOCUMENT_MAX_FILES} łącznie`}
            </p>
          </DropzoneEmptyState>
          <DropzoneContent />
        </Dropzone>
        <ContestOfferFieldError message={fieldErrors?.offerDocumentation} />
      </div>
    </div>
  );
}
