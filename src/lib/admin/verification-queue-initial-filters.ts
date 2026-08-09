import type { VerificationUserSegment } from './verification-user-segment';
import { filterVerificationRowsBySegment } from './verification-user-segment';

export type VerificationQueueStatusFilter = 'pending' | 'email' | 'rejected' | 'approved';

export interface VerificationQueueFilterRow {
  userId: string;
  userType: string;
  accountRole?: string | null;
  organizationType?: string | null;
  companyType?: string | null;
  emailConfirmed: boolean;
}

interface PartitionCounts {
  pending: number;
  email: number;
  rejected: number;
  approved: number;
}

const SEGMENTS: VerificationUserSegment[] = ['contractor', 'manager', 'cooperative'];
const STATUS_PRIORITY: VerificationQueueStatusFilter[] = [
  'pending',
  'email',
  'rejected',
  'approved',
];

function partitionCounts(rows: {
  pending: VerificationQueueFilterRow[];
  rejected: VerificationQueueFilterRow[];
  approved: VerificationQueueFilterRow[];
}): PartitionCounts {
  let pending = 0;
  let email = 0;
  let rejected = 0;
  let approved = 0;

  for (const row of rows.pending) {
    if (row.emailConfirmed) pending += 1;
    else email += 1;
  }
  for (const row of rows.rejected) {
    if (row.emailConfirmed) rejected += 1;
    else email += 1;
  }
  for (const row of rows.approved) {
    if (row.emailConfirmed) approved += 1;
    else email += 1;
  }

  return { pending, email, rejected, approved };
}

function countsForSegment(
  segment: VerificationUserSegment,
  pending: VerificationQueueFilterRow[],
  rejected: VerificationQueueFilterRow[],
  approved: VerificationQueueFilterRow[],
): PartitionCounts {
  return partitionCounts({
    pending: filterVerificationRowsBySegment(pending, segment),
    rejected: filterVerificationRowsBySegment(rejected, segment),
    approved: filterVerificationRowsBySegment(approved, segment),
  });
}

function firstNonEmptyStatus(counts: PartitionCounts): VerificationQueueStatusFilter | null {
  for (const status of STATUS_PRIORITY) {
    if (counts[status] > 0) return status;
  }
  return null;
}

/**
 * Pick the first segment/status that actually has users.
 * Prefers actionable "W toku", then Email, then other statuses — across Wykonawcy → Zarządcy → Spółdzielnie.
 */
export function resolveInitialVerificationFilters(
  pending: VerificationQueueFilterRow[],
  rejected: VerificationQueueFilterRow[],
  approved: VerificationQueueFilterRow[],
): { role: VerificationUserSegment; status: VerificationQueueStatusFilter } {
  for (const status of STATUS_PRIORITY) {
    for (const segment of SEGMENTS) {
      const counts = countsForSegment(segment, pending, rejected, approved);
      if (counts[status] > 0) {
        return { role: segment, status };
      }
    }
  }

  return { role: 'contractor', status: 'pending' };
}

/** When switching segment, keep current status if it has rows; otherwise jump to first non-empty. */
export function resolveStatusForSegment(
  segment: VerificationUserSegment,
  preferredStatus: VerificationQueueStatusFilter,
  pending: VerificationQueueFilterRow[],
  rejected: VerificationQueueFilterRow[],
  approved: VerificationQueueFilterRow[],
): VerificationQueueStatusFilter {
  const counts = countsForSegment(segment, pending, rejected, approved);
  if (counts[preferredStatus] > 0) return preferredStatus;
  return firstNonEmptyStatus(counts) ?? preferredStatus;
}

export function hasUsersOutsideCurrentFilter(
  role: VerificationUserSegment,
  status: VerificationQueueStatusFilter,
  pending: VerificationQueueFilterRow[],
  rejected: VerificationQueueFilterRow[],
  approved: VerificationQueueFilterRow[],
): boolean {
  const current = countsForSegment(role, pending, rejected, approved)[status];
  if (current > 0) return false;

  const total =
    pending.length + rejected.length + approved.length;
  return total > 0;
}
