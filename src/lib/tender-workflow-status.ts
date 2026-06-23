/**
 * Manager przetarg / konkurs workflow.
 */

export const TENDER_WORKFLOW_STATUSES = ['active', 'evaluation', 'awarded'] as const;

export type TenderWorkflowStatus = (typeof TENDER_WORKFLOW_STATUSES)[number];

export const CONTEST_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie statusy' },
  { value: 'draft', label: 'Szkic konkursu' },
  { value: 'active', label: 'Zbieranie ofert' },
  { value: 'evaluation', label: 'Wybór ofert' },
  { value: 'no_offers', label: 'Konkurs nierozstrzygnięty' },
  { value: 'awarded', label: 'Konkurs rozstrzygnięty' },
  { value: 'cancelled', label: 'Konkurs unieważniony' },
] as const;

const WORKFLOW_LABELS: Record<TenderWorkflowStatus, string> = {
  active: 'Zbieranie ofert',
  evaluation: 'Wybór ofert',
  awarded: 'Konkurs rozstrzygnięty',
};

const EXTRA_LABELS: Record<string, string> = {
  draft: 'Szkic konkursu',
  paused: 'Wstrzymane',
  no_offers: 'Konkurs nierozstrzygnięty',
  cancelled: 'Konkurs unieważniony',
};

/** OPD-60 contest-specific labels (preferred in Konkursy UI). */
export function getContestWorkflowStatusLabel(status: string): string {
  if (status in WORKFLOW_LABELS) {
    return WORKFLOW_LABELS[status as TenderWorkflowStatus];
  }
  return EXTRA_LABELS[status] || status;
}

export function getTenderWorkflowStatusLabel(status: string): string {
  return getContestWorkflowStatusLabel(status);
}

export function getTenderWorkflowStatusIndex(status: string): number {
  const idx = TENDER_WORKFLOW_STATUSES.indexOf(status as TenderWorkflowStatus);
  return idx >= 0 ? idx : -1;
}

export function getNextTenderWorkflowStatus(status: string): TenderWorkflowStatus | null {
  const idx = getTenderWorkflowStatusIndex(status);
  if (idx < 0 || idx >= TENDER_WORKFLOW_STATUSES.length - 1) {
    return null;
  }
  return TENDER_WORKFLOW_STATUSES[idx + 1];
}

export function getManagerAllowedTenderStatuses(
  status: string,
  hasSelectedOffer: boolean,
): string[] {
  if (status === 'draft') {
    return ['draft', ...TENDER_WORKFLOW_STATUSES];
  }
  if (!(TENDER_WORKFLOW_STATUSES as readonly string[]).includes(status)) {
    return [...TENDER_WORKFLOW_STATUSES];
  }

  const currentIdx = TENDER_WORKFLOW_STATUSES.indexOf(status as TenderWorkflowStatus);
  const minIdx = hasSelectedOffer
    ? TENDER_WORKFLOW_STATUSES.indexOf('awarded')
    : 0;

  return TENDER_WORKFLOW_STATUSES.filter((_, i) => i >= currentIdx && i >= minIdx);
}

export interface TenderWorkflowAdvanceAction {
  currentLabel: string;
  nextLabel: string;
  nextStatus: TenderWorkflowStatus;
}

export function getTenderWorkflowAdvanceAction(
  status: string,
  hasSelectedOffer: boolean,
): TenderWorkflowAdvanceAction | null {
  if (hasSelectedOffer && status === 'evaluation') {
    return null;
  }
  if (status === 'evaluation') {
    return null;
  }
  const next = getNextTenderWorkflowStatus(status);
  if (!next) {
    return null;
  }
  return {
    currentLabel: getTenderWorkflowStatusLabel(status),
    nextLabel: getTenderWorkflowStatusLabel(next),
    nextStatus: next,
  };
}

export { formatWorkflowTransitionLabel } from './job-workflow-status';

export function isTenderWorkflowStatusRegression(
  fromStatus: string,
  toStatus: string,
  hasSelectedOffer: boolean,
): boolean {
  const fromIdx = getTenderWorkflowStatusIndex(fromStatus);
  const toIdx = getTenderWorkflowStatusIndex(toStatus);
  if (fromIdx < 0 || toIdx < 0) {
    return false;
  }
  if (toIdx < fromIdx) {
    return true;
  }
  if (hasSelectedOffer) {
    const minIdx = TENDER_WORKFLOW_STATUSES.indexOf('awarded');
    return toIdx < minIdx;
  }
  return false;
}

/** Manager may open compare only in evaluation (or read-only in awarded/cancelled). */
export function canCompareContestOffers(status: string): boolean {
  return status === 'evaluation' || status === 'awarded' || status === 'cancelled';
}

export function isContestCompareReadOnly(status: string): boolean {
  return status === 'awarded' || status === 'cancelled';
}

export function canCancelContest(status: string): boolean {
  return status === 'active' || status === 'evaluation' || status === 'no_offers';
}

/** Manager may permanently delete an unpublished contest draft (no submitted offers). */
export function canAbandonManagerContestDraft(
  status: string,
  offersCount: number,
): boolean {
  return status === 'draft' && offersCount === 0;
}
