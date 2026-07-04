import { getJobWorkflowStatusLabel } from '../job-workflow-status';

export type OfferBaseStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'pending';

export type ListingBaseStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'inactive'
  | 'evaluation'
  | 'awarded'
  | 'collecting_offers'
  | 'selecting_offer'
  | 'in_progress'
  | 'ready_for_acceptance';

export type StatusTone = 'neutral' | 'destructive' | 'success' | 'info';

export const offerStatusLabel: Record<OfferBaseStatus, string> = {
  submitted: 'Złożona',
  pending: 'Złożona',
  under_review: 'W ocenie',
  shortlisted: 'Krótka lista',
  accepted: 'Zaakceptowana',
  rejected: 'Odrzucona',
  cancelled: 'Anulowana',
};

export const listingStatusLabel: Record<ListingBaseStatus, string> = {
  draft: 'Szkic',
  active: 'Zbieranie ofert',
  paused: 'Wstrzymane',
  completed: 'Zakończone',
  cancelled: 'Anulowane',
  inactive: 'Nieaktywne',
  evaluation: 'Ocena',
  awarded: 'Przyznane',
  collecting_offers: 'Zbieranie ofert',
  selecting_offer: 'Wybór ofert',
  in_progress: 'W realizacji',
  ready_for_acceptance: 'Do odbioru',
};

export interface StatusDescriptor {
  label: string;
  tone: StatusTone;
}

export function offerEffectiveStatus(baseStatus: string, adminModerationStatus: string): StatusDescriptor {
  if (adminModerationStatus === 'suspended') {
    return { label: 'Zawieszona', tone: 'destructive' };
  }
  const label = offerStatusLabel[baseStatus as OfferBaseStatus] ?? baseStatus;
  switch (baseStatus) {
    case 'accepted':
      return { label, tone: 'success' };
    case 'rejected':
    case 'cancelled':
      return { label, tone: 'destructive' };
    case 'under_review':
    case 'shortlisted':
      return { label, tone: 'info' };
    default:
      return { label, tone: 'neutral' };
  }
}

export function listingEffectiveStatus(baseStatus: string): StatusDescriptor {
  const label =
    listingStatusLabel[baseStatus as ListingBaseStatus] ?? getJobWorkflowStatusLabel(baseStatus);
  switch (baseStatus) {
    case 'active':
    case 'collecting_offers':
    case 'selecting_offer':
    case 'in_progress':
    case 'ready_for_acceptance':
    case 'awarded':
    case 'completed':
      return { label, tone: 'success' };
    case 'paused':
    case 'cancelled':
      return { label, tone: 'destructive' };
    case 'evaluation':
      return { label, tone: 'info' };
    case 'inactive':
      return { label, tone: 'neutral' };
    default:
      return { label, tone: 'neutral' };
  }
}

export function statusBadgeClass(tone: StatusTone): string {
  switch (tone) {
    case 'destructive':
      return 'bg-destructive/10 text-destructive border border-destructive/30';
    case 'success':
      return 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30';
    case 'info':
      return 'bg-blue-500/10 text-blue-700 border border-blue-500/30';
    case 'neutral':
    default:
      return 'bg-muted text-muted-foreground border border-border';
  }
}
