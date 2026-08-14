import type {
  ContestOfferAttachmentRef,
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
  return {
    id: `profile-${doc.requirementKey}`,
    name: doc.fileName ?? doc.label,
    path: doc.path,
    url: doc.signedUrl ?? undefined,
    type: 'document',
    source: 'profile',
    requirementKey: doc.requirementKey as FormalRequirementKey,
  };
}

export function applyProfileDocumentsToForm(
  docs: ResolvedContractorDocument[],
  existing: Partial<Record<FormalRequirementKey, ContestOfferAttachmentRef>>,
): Partial<Record<FormalRequirementKey, ContestOfferAttachmentRef>> {
  const next = { ...existing };
  for (const doc of docs) {
    if (!supportsContestOfferProfileAutofill(doc.requirementKey)) continue;
    if (next[doc.requirementKey]) continue;
    const attachment = buildFormalAttachmentFromProfile(doc);
    if (attachment) {
      next[doc.requirementKey] = attachment;
    }
  }
  return next;
}
