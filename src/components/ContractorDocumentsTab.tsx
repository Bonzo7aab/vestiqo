'use client';

import { VerificationPage } from './VerificationPage';
import type { VerificationStatus } from '../lib/database/verification';
import type {
  DocumentReviewMap,
  VerificationDocumentEntry,
} from '../lib/database/admin-verification';

interface ContractorDocumentsTabProps {
  userId: string;
  initialStatus: VerificationStatus;
  existingDocuments: VerificationDocumentEntry[];
  documentReviews?: DocumentReviewMap;
}

/**
 * Contractor account tab: verification documents (polisa OC, certyfikaty, referencje,
 * uprawnienia zawodowe, dodatkowe informacje).
 */
export function ContractorDocumentsTab({
  userId,
  initialStatus,
  existingDocuments,
  documentReviews,
}: ContractorDocumentsTabProps) {
  return (
    <VerificationPage
      embedded
      userId={userId}
      initialStatus={initialStatus}
      existingDocuments={existingDocuments}
      documentReviews={documentReviews}
    />
  );
}
