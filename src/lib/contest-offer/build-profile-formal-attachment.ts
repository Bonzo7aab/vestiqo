import type {
  ContestOfferAttachmentRef,
  ContestOfferFormData,
  FormalRequirementKey,
  ResolvedContractorDocument,
} from '../../types/contest-offer';

/** Profile autofill is not offered for these requirements (upload-only in the offer wizard). */
export const CONTEST_OFFER_PROFILE_AUTOFILL_EXCLUDED: FormalRequirementKey[] = [
  'zusUsCertificates',
];

export function supportsContestOfferProfileAutofill(key: FormalRequirementKey): boolean {
  return !CONTEST_OFFER_PROFILE_AUTOFILL_EXCLUDED.includes(key);
}

export function buildFormalAttachmentFromProfile(
  doc: ResolvedContractorDocument,
): ContestOfferAttachmentRef | null {
  if (!doc.path) return null;
  const attachment: ContestOfferAttachmentRef = {
    id: doc.qualificationTypeId
      ? `profile-${doc.requirementKey}-${doc.qualificationTypeId}`
      : `profile-${doc.requirementKey}`,
    name: doc.fileName ?? doc.label,
    path: doc.path,
    type: 'document',
    source: 'profile',
    requirementKey: doc.requirementKey as FormalRequirementKey,
  };
  if (doc.qualificationTypeId) {
    attachment.qualificationTypeId = doc.qualificationTypeId;
  }
  if (doc.signedUrl) {
    attachment.url = doc.signedUrl;
  }
  return attachment;
}

export function applyProfileDocumentsToForm(
  docs: ResolvedContractorDocument[],
  form: Pick<ContestOfferFormData, 'formalAttachments' | 'qualificationAttachments'>,
): Pick<ContestOfferFormData, 'formalAttachments' | 'qualificationAttachments'> {
  const formalAttachments = { ...form.formalAttachments };
  const qualificationAttachments = [...form.qualificationAttachments];

  for (const doc of docs) {
    if (!supportsContestOfferProfileAutofill(doc.requirementKey)) continue;
    const attachment = buildFormalAttachmentFromProfile(doc);
    if (!attachment) continue;

    if (doc.qualificationTypeId) {
      const exists = qualificationAttachments.some(
        (item) => item.qualificationTypeId === doc.qualificationTypeId,
      );
      if (!exists) {
        qualificationAttachments.push(attachment);
      }
      continue;
    }

    if (formalAttachments[doc.requirementKey]) continue;
    formalAttachments[doc.requirementKey] = attachment;
  }

  return { formalAttachments, qualificationAttachments };
}
