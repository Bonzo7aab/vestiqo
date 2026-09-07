'use client';

import { type ReactElement } from 'react';
import type {
  ContestOfferFormData,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import { contestOfferDocumentSlotKey } from '../../types/contest-offer';
import type { OfferDocumentRequirement } from '../../types/tender-contest';
import type { ContestOfferFieldErrors } from '../../lib/contest-offer/offer-form-validation';
import { ContestOfferFormalDocBlock } from './ContestOfferFormalDocBlock';
import { ContestOfferNamedDocumentBlock } from './ContestOfferNamedDocumentBlock';

interface ContestOfferStepFormalProps {
  form: ContestOfferFormData;
  resolvedDocs: ResolvedContractorDocument[];
  offerDocuments: OfferDocumentRequirement[];
  fieldErrors: ContestOfferFieldErrors;
  insuranceOcMinAmount?: number | null;
  onUseProfile: (doc: ResolvedContractorDocument) => void;
  onUploadFormal: (doc: ResolvedContractorDocument, file: File) => void;
  onRemoveFormal: (doc: ResolvedContractorDocument) => void;
  onUploadOfferDocument: (documentId: string, file: File) => void;
  onRemoveOfferDocument: (documentId: string) => void;
  onFileIssue?: (doc: ResolvedContractorDocument, message: string | null) => void;
  onOfferDocumentFileIssue?: (documentId: string, message: string | null) => void;
  onOcValidUntilChange?: (value: string) => void;
  onOcGuaranteeAmountChange?: (value: string) => void;
  onOcFieldsBlur?: () => void;
}

export function ContestOfferStepFormal({
  form,
  resolvedDocs,
  offerDocuments,
  fieldErrors,
  insuranceOcMinAmount = null,
  onUseProfile,
  onUploadFormal,
  onRemoveFormal,
  onUploadOfferDocument,
  onRemoveOfferDocument,
  onFileIssue,
  onOfferDocumentFileIssue,
  onOcValidUntilChange,
  onOcGuaranteeAmountChange,
  onOcFieldsBlur,
}: ContestOfferStepFormalProps): ReactElement {
  if (offerDocuments.length === 0 && resolvedDocs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Brak wymaganych dokumentów w tym konkursie.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {offerDocuments.map((document) => {
        const attached = form.extraAttachments.find((item) => item.offerDocumentId === document.id);
        const stagedFile = form.stagedOfferDocumentFiles[document.id];
        return (
          <ContestOfferNamedDocumentBlock
            key={document.id}
            document={document}
            attached={attached}
            stagedName={stagedFile?.name}
            stagedSize={stagedFile?.size}
            fieldError={fieldErrors.offerDocuments?.[document.id]}
            onUpload={(file) => onUploadOfferDocument(document.id, file)}
            onRemove={() => onRemoveOfferDocument(document.id)}
            onFileIssue={(message) => onOfferDocumentFileIssue?.(document.id, message)}
          />
        );
      })}
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
