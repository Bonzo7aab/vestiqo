/**
 * OPD-62: Contractor-facing contest offer status (perspective of Wykonawca).
 */

export type ContractorContestOfferStatus =
  | 'draft'
  | 'submitted'
  | 'in_evaluation'
  | 'selected'
  | 'not_selected'
  | 'withdrawn';

export interface ContractorContestOfferStatusInput {
  bidStatus: string;
  tenderStatus: string;
  submissionDeadlineIso: string | null | undefined;
  now?: Date;
}

const LABELS: Record<ContractorContestOfferStatus, string> = {
  draft: 'Szkic',
  submitted: 'Oferta złożona',
  in_evaluation: 'Oferta w ocenie',
  selected: 'Wybrana',
  not_selected: 'Niewybrana',
  withdrawn: 'Wycofana',
};

export const CONTRACTOR_CONTEST_OFFER_FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie oferty' },
  { value: 'draft', label: 'Szkic' },
  { value: 'submitted', label: 'Złożona (Sejf zamknięty)' },
  { value: 'in_evaluation', label: 'W ocenie (Sejf otwarty)' },
  { value: 'selected', label: 'Wybrana' },
  { value: 'not_selected', label: 'Niewybrana' },
  { value: 'withdrawn', label: 'Wycofana' },
] as const;

export type ContractorContestOfferFilterValue =
  (typeof CONTRACTOR_CONTEST_OFFER_FILTER_OPTIONS)[number]['value'];

function isSubmissionDeadlinePast(
  submissionDeadlineIso: string | null | undefined,
  now: Date,
): boolean {
  if (!submissionDeadlineIso) return false;
  const deadline = new Date(submissionDeadlineIso);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < now.getTime();
}

export function deriveContractorContestOfferStatus(
  input: ContractorContestOfferStatusInput,
): ContractorContestOfferStatus {
  const { bidStatus, tenderStatus, submissionDeadlineIso } = input;
  const now = input.now ?? new Date();
  const deadlinePassed = isSubmissionDeadlinePast(submissionDeadlineIso, now);

  if (bidStatus === 'draft') {
    return 'draft';
  }

  if (bidStatus === 'cancelled') {
    return 'withdrawn';
  }
  if (bidStatus === 'accepted') {
    return 'selected';
  }
  if (bidStatus === 'rejected') {
    return 'not_selected';
  }

  if (tenderStatus === 'cancelled' || tenderStatus === 'no_offers') {
    return 'not_selected';
  }

  if (tenderStatus === 'evaluation' || (tenderStatus === 'active' && deadlinePassed)) {
    return 'in_evaluation';
  }

  if (tenderStatus === 'active' && !deadlinePassed) {
    return 'submitted';
  }

  if (tenderStatus === 'awarded') {
    return 'not_selected';
  }

  return 'submitted';
}

export function getContractorContestOfferStatusLabel(
  status: ContractorContestOfferStatus,
): string {
  return LABELS[status];
}

export type ContractorContestOfferStatusVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success';

export function getContractorContestOfferStatusVariant(
  status: ContractorContestOfferStatus,
): ContractorContestOfferStatusVariant {
  switch (status) {
    case 'draft':
      return 'outline';
    case 'selected':
      return 'success';
    case 'not_selected':
    case 'withdrawn':
      return 'destructive';
    case 'in_evaluation':
      return 'default';
    case 'submitted':
    default:
      return 'secondary';
  }
}

export function canAbandonContestOfferDraft(bidStatus: string): boolean {
  return bidStatus === 'draft';
}

export function canWithdrawContestOffer(
  input: ContractorContestOfferStatusInput,
): boolean {
  const { bidStatus, tenderStatus, submissionDeadlineIso } = input;
  const now = input.now ?? new Date();

  if (
    bidStatus === 'draft' ||
    bidStatus === 'cancelled' ||
    bidStatus === 'accepted' ||
    bidStatus === 'rejected'
  ) {
    return false;
  }

  if (tenderStatus !== 'active') {
    return false;
  }

  if (isSubmissionDeadlinePast(submissionDeadlineIso, now)) {
    return false;
  }

  return true;
}

export function canMessageManagerOnContestOffer(
  derivedStatus: ContractorContestOfferStatus,
): boolean {
  return derivedStatus === 'selected';
}

export function canRateCooperationOnContestOffer(
  derivedStatus: ContractorContestOfferStatus,
): boolean {
  return derivedStatus === 'selected';
}

export function matchesContestOfferFilter(
  derivedStatus: ContractorContestOfferStatus,
  filter: ContractorContestOfferFilterValue,
): boolean {
  if (filter === 'all') return true;
  return derivedStatus === filter;
}
