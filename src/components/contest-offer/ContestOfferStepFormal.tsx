'use client';

import { type ReactElement } from 'react';
import type {
  ContestOfferFormData,
  FormalRequirementKey,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/contest-offer/offer-form-validation';
import { ContestOfferFormalDocBlock } from './ContestOfferFormalDocBlock';

interface ContestOfferStepFormalProps {
  form: ContestOfferFormData;
  resolvedDocs: ResolvedContractorDocument[];
  fieldErrors: ContestOfferFieldErrors;
  onUseProfile: (doc: ResolvedContractorDocument) => void;
  onUploadFormal: (key: FormalRequirementKey, file: File) => void;
  onRemoveFormal: (key: FormalRequirementKey) => void;
  onFileIssue?: (key: FormalRequirementKey, message: string | null) => void;
}

export function ContestOfferStepFormal({
  form,
  resolvedDocs,
  fieldErrors,
  onUseProfile,
  onUploadFormal,
  onRemoveFormal,
  onFileIssue,
}: ContestOfferStepFormalProps): ReactElement {
  return (
    <div className="space-y-6">
      {resolvedDocs.map((doc) => (
        <ContestOfferFormalDocBlock
          key={doc.requirementKey}
          doc={doc}
          attached={form.formalAttachments[doc.requirementKey]}
          stagedName={form.stagedFiles[doc.requirementKey]?.[0]?.name}
          stagedSize={form.stagedFiles[doc.requirementKey]?.[0]?.size}
          fieldError={fieldErrors.formal?.[doc.requirementKey]}
          onUseProfile={() => onUseProfile(doc)}
          onUpload={(file) => onUploadFormal(doc.requirementKey, file)}
          onRemove={() => onRemoveFormal(doc.requirementKey)}
          onFileIssue={(message) => onFileIssue?.(doc.requirementKey, message)}
        />
      ))}
    </div>
  );
}
