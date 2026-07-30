'use client';

import { type ReactElement } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import type { ContestInfo } from '../../types/job';
import type {
  ContestOfferFormData,
  FormalRequirementKey,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/database/contest-offers';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import { cn } from '../ui/utils';
import {
  contestOfferFileIconWrapClass,
  contestOfferStagedFileRowClass,
  contestOfferUploadedFileRowClass,
  ContestOfferFormalDocBlock,
} from './ContestOfferFormalDocBlock';
import {
  ContestOfferFieldError,
  ContestOfferOptionalLabel,
  ContestOfferRequiredLabel,
  fieldErrorInputClass,
} from './ContestOfferFieldError';

interface ContestOfferStepFormalProps {
  form: ContestOfferFormData;
  contestInfo: ContestInfo;
  resolvedDocs: ResolvedContractorDocument[];
  fieldErrors: ContestOfferFieldErrors;
  onPatch: (patch: Partial<ContestOfferFormData>) => void;
  onUseProfile: (doc: ResolvedContractorDocument) => void;
  onUploadFormal: (key: FormalRequirementKey, file: File) => void;
  onRemoveFormal: (key: FormalRequirementKey) => void;
  onStageOtherFiles: (files: File[]) => void;
  onRemoveExtra: (id: string) => void;
  onRemoveStagedOther: (index: number) => void;
}

export function ContestOfferStepFormal({
  form,
  contestInfo,
  resolvedDocs,
  fieldErrors,
  onPatch,
  onUseProfile,
  onUploadFormal,
  onRemoveFormal,
  onStageOtherFiles,
  onRemoveExtra,
  onRemoveStagedOther,
}: ContestOfferStepFormalProps): ReactElement {
  const extraDocs = form.extraAttachments.filter((a) => a.requirementKey === 'other');
  const stagedOther = form.stagedFiles.other ?? [];
  const hasExtraFiles = extraDocs.length > 0 || stagedOther.length > 0;

  return (
    <div className="space-y-6">
      {resolvedDocs
        .filter((doc) => doc.requirementKey !== 'references')
        .map((doc) => (
          <ContestOfferFormalDocBlock
            key={doc.requirementKey}
            doc={doc}
            attached={form.formalAttachments[doc.requirementKey]}
            stagedName={form.stagedFiles[doc.requirementKey]?.[0]?.name}
            fieldError={fieldErrors.formal?.[doc.requirementKey]}
            onUseProfile={() => onUseProfile(doc)}
            onUpload={(file) => onUploadFormal(doc.requirementKey, file)}
            onRemove={() => onRemoveFormal(doc.requirementKey)}
          />
        ))}

      {contestInfo.formalRequirements.references ? (
        <div>
          <ContestOfferRequiredLabel htmlFor="contest-offer-referencesText">
            Referencje — wykaz zrealizowanych prac
          </ContestOfferRequiredLabel>
          <Textarea
            id="contest-offer-referencesText"
            rows={5}
            value={form.referencesText}
            onChange={(e) => onPatch({ referencesText: e.target.value })}
            placeholder="Opisz zrealizowane projekty, zakres prac, lokalizację…"
            className={cn('mt-1.5', fieldErrorInputClass(Boolean(fieldErrors.referencesText)))}
            aria-invalid={Boolean(fieldErrors.referencesText)}
          />
          <ContestOfferFieldError message={fieldErrors.referencesText} />
        </div>
      ) : null}

      <div>
        <ContestOfferOptionalLabel>Inne załączniki</ContestOfferOptionalLabel>
        <p className="mb-3 mt-1 text-sm text-muted-foreground">
          Dodatkowe pliki, które chcesz dołączyć do oferty.
        </p>

        {hasExtraFiles ? (
          <ul className="mb-3 space-y-2">
            {extraDocs.map((att, index) => (
              <li
                key={att.path ? `path-${att.path}` : `${att.id}-${index}`}
                className={contestOfferUploadedFileRowClass}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={contestOfferFileIconWrapClass} aria-hidden>
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{att.name}</span>
                    <span className="text-xs text-muted-foreground">Dołączony do oferty</span>
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
            {stagedOther.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`} className={contestOfferStagedFileRowClass}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={contestOfferFileIconWrapClass} aria-hidden>
                    <Upload className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Nowy plik — zostanie wysłany przy zapisie
                    </span>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Usuń ${file.name}`}
                  onClick={() => onRemoveStagedOther(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <Dropzone
          accept={{
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
          }}
          maxFiles={10}
          onDrop={(files) => {
            if (files.length > 0) onStageOtherFiles(files);
          }}
          className={cn('min-h-[140px] border-dashed p-5', hasExtraFiles && 'min-h-[88px]')}
        >
          <DropzoneEmptyState>
            <p className="text-sm font-medium">
              {hasExtraFiles
                ? 'Dodaj kolejne pliki — przeciągnij lub kliknij'
                : 'Przeciągnij pliki tutaj lub kliknij, aby wybrać'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOC, DOCX lub obrazy — możesz dodać wiele plików naraz
            </p>
          </DropzoneEmptyState>
          <DropzoneContent />
        </Dropzone>
      </div>
    </div>
  );
}
