'use client';

import { useRef, type ReactElement } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import type { ContestOfferFormData } from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/database/contest-offers';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import { ContestOfferFieldError, ContestOfferRequiredLabel } from './ContestOfferFieldError';
import {
  contestOfferStagedFileRowClass,
  contestOfferUploadedFileRowClass,
} from './ContestOfferFormalDocBlock';
import { cn } from '../ui/utils';

interface ContestOfferStepBasicProps {
  form: ContestOfferFormData;
  onStageFiles: (files: File[]) => void;
  onRemoveExtra: (id: string) => void;
  onRemoveStaged: (index: number) => void;
  fieldErrors?: Pick<ContestOfferFieldErrors, 'offerDocumentation'>;
}

export function ContestOfferStepBasic({
  form,
  onStageFiles,
  onRemoveExtra,
  onRemoveStaged,
  fieldErrors,
}: ContestOfferStepBasicProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const offerDocs = form.extraAttachments.filter((a) => a.requirementKey === 'offerDocumentation');
  const stagedFiles = form.stagedFiles.offerDocumentation ?? [];
  const hasFiles = offerDocs.length > 0 || stagedFiles.length > 0;
  const hasError = Boolean(fieldErrors?.offerDocumentation);

  return (
    <div className="space-y-4" id="contest-offer-offerDocumentation">
      <div>
        <ContestOfferRequiredLabel>Dokumentacja ofertowa</ContestOfferRequiredLabel>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Dodaj pliki oferty — kosztorys, opis techniczny, załączniki wymagane w konkursie.
        </p>
        <Dropzone
          accept={{
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
          }}
          maxFiles={10}
          onDrop={(files) => {
            if (files.length > 0) onStageFiles(files);
          }}
          className={cn('min-h-[180px] border-dashed', hasError && 'border-destructive')}
        >
          <DropzoneEmptyState>
            <p className="text-sm font-medium">Przeciągnij pliki tutaj lub kliknij, aby wybrać</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, DOCX lub obrazy — możesz dodać wiele plików naraz
            </p>
          </DropzoneEmptyState>
          <DropzoneContent />
        </Dropzone>
        <ContestOfferFieldError message={fieldErrors?.offerDocumentation} />
      </div>

      {hasFiles ? (
        <ul className="space-y-2">
          {offerDocs.map((att) => (
            <li
              key={att.id}
              className={contestOfferUploadedFileRowClass}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{att.name}</span>
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
              <span className="flex min-w-0 items-center gap-2">
                <Upload className="h-4 w-4 shrink-0" />
                <span className="truncate">{file.name}</span>
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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,image/*"
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onStageFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
