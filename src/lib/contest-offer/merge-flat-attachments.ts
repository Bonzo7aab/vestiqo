import type {
  ContestOfferFormData,
  FormalRequirementKey,
} from '../../types/contest-offer';

export function mergeFlatAttachmentsIntoForm(
  form: ContestOfferFormData,
  attachments: unknown,
): void {
  if (!attachments || !Array.isArray(attachments)) return;

  for (const att of attachments as Array<{
    requirementKey?: string;
    source?: string;
    name: string;
    path: string;
    url?: string;
    type: string;
    id: string;
    size?: number;
    qualificationTypeId?: string;
  }>) {
    if (att.qualificationTypeId) {
      const alreadyPresent = form.qualificationAttachments.some(
        (existing) =>
          existing.qualificationTypeId === att.qualificationTypeId ||
          existing.id === att.id ||
          (att.path && existing.path === att.path),
      );
      if (alreadyPresent) continue;
      form.qualificationAttachments.push({
        id: att.id,
        name: att.name,
        path: att.path,
        url: att.url,
        type: att.type === 'image' ? 'image' : 'document',
        source: att.source === 'profile' ? 'profile' : 'override',
        requirementKey:
          att.requirementKey === 'professionalCertificates'
            ? 'professionalCertificates'
            : 'professionalLicenses',
        qualificationTypeId: att.qualificationTypeId,
        size: att.size,
      });
      continue;
    }

    if (
      att.requirementKey &&
      att.requirementKey !== 'deposit' &&
      att.requirementKey !== 'other' &&
      att.requirementKey !== 'offerDocumentation'
    ) {
      form.formalAttachments[att.requirementKey as FormalRequirementKey] = {
        id: att.id,
        name: att.name,
        path: att.path,
        url: att.url,
        type: att.type === 'image' ? 'image' : 'document',
        source: att.source === 'profile' ? 'profile' : 'override',
        requirementKey: att.requirementKey as FormalRequirementKey,
        size: att.size,
      };
    } else {
      const alreadyPresent = form.extraAttachments.some(
        (existing) => existing.id === att.id || (att.path && existing.path === att.path),
      );
      if (alreadyPresent) continue;
      form.extraAttachments.push({
        id: att.id,
        name: att.name,
        path: att.path,
        url: att.url,
        type: att.type === 'image' ? 'image' : 'document',
        source: 'extra',
        requirementKey: att.requirementKey as
          | 'deposit'
          | 'offerDocumentation'
          | 'other'
          | undefined,
        size: att.size,
      });
    }
  }
}
