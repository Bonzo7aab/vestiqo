import type { ContestOfferFormData, FormalRequirementKey } from '../../types/contest-offer';
import { uploadBidAttachment } from '../storage/bid-attachments';
import { contestOfferUploadFailureMessage } from './contest-offer-form-documents';

function newAttachmentId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadContestOfferStagedFiles(
  userId: string,
  tenderId: string,
  form: ContestOfferFormData,
): Promise<{ form: ContestOfferFormData; error: string | null }> {
  const next = { ...form, formalAttachments: { ...form.formalAttachments } };
  const staged = form.stagedFiles;

  for (const [key, files] of Object.entries(staged)) {
    if (!files?.length) continue;

    if (key === 'other' || key === 'offerDocumentation') {
      const requirementKey = key as 'other' | 'offerDocumentation';
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { data, error } = await uploadBidAttachment(file, userId, tenderId);
        if (error || !data) {
          return {
            form: next,
            error: contestOfferUploadFailureMessage([{ file: file.name, error }]),
          };
        }
        next.extraAttachments = [
          ...next.extraAttachments,
          {
            id: newAttachmentId(`${key}-${i}`),
            name: file.name,
            path: data.path,
            url: data.url,
            type: data.type === 'image' ? ('image' as const) : ('document' as const),
            source: 'override' as const,
            requirementKey,
            size: file.size,
          },
        ];
      }
      continue;
    }

    const file = files[0];
    const { data, error } = await uploadBidAttachment(file, userId, tenderId);
    if (error || !data) {
      return {
        form: next,
        error: contestOfferUploadFailureMessage([{ file: file.name, error }]),
      };
    }

    if (key === 'deposit') {
      // Replace any existing deposit file instead of appending duplicates.
      next.extraAttachments = [
        ...next.extraAttachments.filter((a) => a.requirementKey !== 'deposit'),
        {
          id: newAttachmentId(key),
          name: file.name,
          path: data.path,
          url: data.url,
          type: data.type === 'image' ? ('image' as const) : ('document' as const),
          source: 'override' as const,
          requirementKey: key,
          size: file.size,
        },
      ];
    } else {
      const formalKey = key as FormalRequirementKey;
      next.formalAttachments[formalKey] = {
        id: newAttachmentId(key),
        name: file.name,
        path: data.path,
        url: data.url,
        type: data.type === 'image' ? ('image' as const) : ('document' as const),
        source: 'override' as const,
        requirementKey: formalKey,
        size: file.size,
      };
    }
  }

  next.stagedFiles = {};
  return { form: next, error: null };
}
