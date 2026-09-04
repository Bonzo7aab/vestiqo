'use client';

import { type ReactElement } from 'react';
import type {
  ContestOfferFormData,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import { contestOfferDocumentSlotKey } from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/contest-offer/offer-form-validation';
import { ContestOfferFormalDocBlock } from './ContestOfferFormalDocBlock';

interface ContestOfferStepFormalProps {
  form: ContestOfferFormData;
  resolvedDocs: ResolvedContractorDocument[];
  fieldErrors: ContestOfferFieldErrors;
  insuranceOcMinAmount?: number | null;
  onUseProfile: (doc: ResolvedContractorDocument) => void;
  onUploadFormal: (doc: ResolvedContractorDocument, file: File) => void;
  onRemoveFormal: (doc: ResolvedContractorDocument) => void;
  onFileIssue?: (doc: ResolvedContractorDocument, message: string | null) => void;
  onOcValidUntilChange?: (value: string) => void;
  onOcGuaranteeAmountChange?: (value: string) => void;
  onOcFieldsBlur?: () => void;
}

export function ContestOfferStepFormal({
  form,
  resolvedDocs,
  fieldErrors,
  insuranceOcMinAmount = null,
  onUseProfile,
  onUploadFormal,
  onRemoveFormal,
  onFileIssue,
  onOcValidUntilChange,
  onOcGuaranteeAmountChange,
  onOcFieldsBlur,
}: ContestOfferStepFormalProps): ReactElement {
  return (
    <div className="space-y-6">
      {resolvedDocs.map((doc) => {
        const typeId = doc.qualificationTypeId;
        const attached = typeId
          ? form.qualificationAttachments.find((item) => item.qualificationTypeId === typeId)
          : form.formalAttachments[doc.requirementKey];
        const stagedFile = typeId
          ? form.stagedQualificationFiles[typeId]
          : form.stagedFiles[doc.requirementKey]?.[0];
        const fieldError = typeId
          ? fieldErrors.qualificationFiles?.[typeId] ?? fieldErrors.formal?.professionalLicenses
          : fieldErrors.formal?.[doc.requirementKey];

        return (
          <ContestOfferFormalDocBlock
            key={contestOfferDocumentSlotKey(doc)}
            doc={doc}
            attached={attached}
            stagedName={stagedFile?.name}
            stagedSize={stagedFile?.size}
            fieldError={fieldError}
            onUseProfile={() => onUseProfile(doc)}
            onUpload={(file) => onUploadFormal(doc, file)}
            onRemove={() => onRemoveFormal(doc)}
            onFileIssue={(message) => onFileIssue?.(doc, message)}
            ocValidUntil={form.ocValidUntil}
            ocGuaranteeAmount={form.ocGuaranteeAmount}
            insuranceOcMinAmount={insuranceOcMinAmount}
            onOcValidUntilChange={onOcValidUntilChange}
            onOcGuaranteeAmountChange={onOcGuaranteeAmountChange}
            onOcFieldsBlur={onOcFieldsBlur}
          />
        );
      })}
    </div>
  );
}
