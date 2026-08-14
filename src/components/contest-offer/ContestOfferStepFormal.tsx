'use client';

import { type ReactElement } from 'react';
import type {
  ContestOfferFormData,
  FormalRequirementKey,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/database/contest-offers';
import { ContestOfferFormalDocBlock } from './ContestOfferFormalDocBlock';

interface ContestOfferStepFormalProps {
  form: ContestOfferFormData;
  resolvedDocs: ResolvedContractorDocument[];
  fieldErrors: ContestOfferFieldErrors;
  onUseProfile: (doc: ResolvedContractorDocument) => void;
  onUploadFormal: (key: FormalRequirementKey, file: File) => void;
  onRemoveFormal: (key: FormalRequirementKey) => void;
}

export function ContestOfferStepFormal({
  form,
  resolvedDocs,
  fieldErrors,
  onUseProfile,
  onUploadFormal,
  onRemoveFormal,
}: ContestOfferStepFormalProps): ReactElement {
  return (
    <div className="space-y-6">
      {resolvedDocs.map((doc) => (
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
    </div>
  );
}
