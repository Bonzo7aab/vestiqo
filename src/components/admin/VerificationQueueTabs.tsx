'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HardHat,
  Mail,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';
import type {
  ApprovedVerificationRow,
  PendingVerificationRow,
  RejectedVerificationRow,
  VerificationQueueRowBase,
} from '../../lib/database/admin-verification';
import {
  resolveAdminUserStatus,
  resolveQueueVerificationState,
} from '../../lib/admin/resolve-admin-user-status';
import { VerificationStatusBadge } from './VerificationStatusBadge';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminFilterChip } from './AdminFilterChip';
import { AdminPanelCard } from './AdminPanelCard';

interface QueueRow extends VerificationQueueRowBase {
  emailConfirmed: boolean;
}

interface PendingRow extends PendingVerificationRow {
  emailConfirmed: boolean;
}

interface RejectedRow extends RejectedVerificationRow {
  emailConfirmed: boolean;
}

interface ApprovedRow extends ApprovedVerificationRow {
  emailConfirmed: boolean;
}

interface VerificationQueueTabsProps {
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
}

type RoleFilter = 'contractor' | 'manager';
type StatusFilter = 'pending' | 'email' | 'rejected' | 'approved';

const USER_TYPE_LABELS: Record<string, string> = {
  contractor: 'Wykonawca',
  manager: 'Zarządca',
};

const STATUS_META: Record<
  StatusFilter,
  { label: string; icon: typeof Clock3; accent: string }
> = {
  pending: {
    label: 'W toku',
    icon: Clock3,
    accent: 'text-amber-600 dark:text-amber-400',
  },
  email: {
    label: 'Email',
    icon: Mail,
    accent: 'text-sky-600 dark:text-sky-400',
  },
  rejected: {
    label: 'Odrzucone',
    icon: XCircle,
    accent: 'text-red-600 dark:text-red-400',
  },
  approved: {
    label: 'Zaakceptowane',
    icon: CheckCircle2,
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function filterByRole<T extends { userType: string }>(rows: T[], role: RoleFilter): T[] {
  return rows.filter((r) => r.userType === role);
}

function partitionByEmailConfirmation<T extends QueueRow>(rows: T[]): {
  emailUnconfirmed: T[];
  confirmed: T[];
} {
  const emailUnconfirmed: T[] = [];
  const confirmed: T[] = [];

  for (const row of rows) {
    if (!row.emailConfirmed) {
      emailUnconfirmed.push(row);
    } else {
      confirmed.push(row);
    }
  }

  return { emailUnconfirmed, confirmed };
}

function mergeEmailUnconfirmed<T extends QueueRow>(...groups: T[][]): T[] {
  const byId = new Map<string, T>();
  for (const group of groups) {
    for (const row of group) {
      if (!row.emailConfirmed) {
        byId.set(row.userId, row);
      }
    }
  }

  return [...byId.values()].sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl'),
  );
}

function DocumentsProgress({ submitted, expected }: { submitted: number; expected: number }) {
  const ratio = expected > 0 ? Math.min(100, Math.round((submitted / expected) * 100)) : 0;

  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            ratio === 100 ? 'bg-emerald-500' : ratio > 0 ? 'bg-primary' : 'bg-muted-foreground/30',
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {submitted}/{expected}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <AdminEmptyState message={message} />;
}

function QueueTableRow({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <TableRow
      className="group cursor-pointer hover:bg-muted/40"
      onClick={() => router.push(`/administracja/weryfikacja/${userId}`)}
    >
      {children}
      <TableCell className="w-10 text-right">
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </TableCell>
    </TableRow>
  );
}

function EmailUnconfirmedTable({ rows }: { rows: QueueRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="Brak kont oczekujących na potwierdzenie email w tej kategorii." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Użytkownik</TableHead>
          <TableHead>Firma</TableHead>
          <TableHead>Typ konta</TableHead>
          <TableHead>Utworzono</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <QueueTableRow key={r.userId} userId={r.userId}>
            <TableCell>
              <div className="font-medium">
                {r.firstName} {r.lastName}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{r.companyName ?? '—'}</TableCell>
            <TableCell>
              <Badge variant="outline">{USER_TYPE_LABELS[r.userType] ?? r.userType}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
          </QueueTableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PendingTable({ rows }: { rows: PendingRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="Brak kont oczekujących na weryfikację w tej kategorii." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Użytkownik</TableHead>
          <TableHead>Firma</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Dokumenty</TableHead>
          <TableHead>Rozpoczęta</TableHead>
          <TableHead>Zaktualizowana</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const verificationState = resolveQueueVerificationState(false, r.verificationSubmittedAt);
          const displayStatus = resolveAdminUserStatus({
            emailConfirmed: r.emailConfirmed,
            verificationState,
          });

          return (
            <QueueTableRow key={r.userId} userId={r.userId}>
              <TableCell>
                <div className="font-medium">
                  {r.firstName} {r.lastName}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.companyName ?? '—'}</TableCell>
              <TableCell>
                <VerificationStatusBadge state={displayStatus} />
              </TableCell>
              <TableCell>
                <DocumentsProgress submitted={r.documentsSubmitted} expected={r.documentsExpected} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(r.updatedAt)}</TableCell>
            </QueueTableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RejectedTable({ rows }: { rows: RejectedRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="Brak odrzuconych weryfikacji w tej kategorii." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Użytkownik</TableHead>
          <TableHead>Firma</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Dokumenty</TableHead>
          <TableHead>Odrzucono</TableHead>
          <TableHead>Powód</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const displayStatus = resolveAdminUserStatus({
            emailConfirmed: r.emailConfirmed,
            verificationState: 'rejected',
          });

          return (
            <QueueTableRow key={r.userId} userId={r.userId}>
              <TableCell>
                <div className="font-medium">
                  {r.firstName} {r.lastName}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.companyName ?? '—'}</TableCell>
              <TableCell>
                <VerificationStatusBadge state={displayStatus} />
              </TableCell>
              <TableCell>
                <DocumentsProgress submitted={r.documentsSubmitted} expected={r.documentsExpected} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(r.decidedAt)}</TableCell>
              <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground" title={r.reason ?? undefined}>
                {r.reason ?? '—'}
              </TableCell>
            </QueueTableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ApprovedTable({ rows }: { rows: ApprovedRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="Brak zweryfikowanych kont w tej kategorii." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Użytkownik</TableHead>
          <TableHead>Firma</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Dokumenty</TableHead>
          <TableHead>Zaakceptowano</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const displayStatus = resolveAdminUserStatus({
            emailConfirmed: r.emailConfirmed,
            verificationState: 'approved',
          });

          return (
            <QueueTableRow key={r.userId} userId={r.userId}>
              <TableCell>
                <div className="font-medium">
                  {r.firstName} {r.lastName}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{r.companyName ?? '—'}</TableCell>
              <TableCell>
                <VerificationStatusBadge state={displayStatus} />
              </TableCell>
              <TableCell>
                <DocumentsProgress submitted={r.documentsSubmitted} expected={r.documentsExpected} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(r.decidedAt)}</TableCell>
            </QueueTableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function VerificationQueuePanel({
  role,
  status,
  onStatusChange,
  emailUnconfirmed,
  pending,
  rejected,
  approved,
}: {
  role: RoleFilter;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  emailUnconfirmed: QueueRow[];
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
}) {
  const counts = {
    pending: pending.length,
    email: emailUnconfirmed.length,
    rejected: rejected.length,
    approved: approved.length,
  };

  const activeMeta = STATUS_META[status];
  const roleLabel = role === 'contractor' ? 'wykonawców' : 'zarządców';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(STATUS_META) as StatusFilter[]).map((key) => {
          const meta = STATUS_META[key];
          return (
            <AdminFilterChip
              key={key}
              label={meta.label}
              count={counts[key]}
              icon={meta.icon}
              active={status === key}
              onClick={() => onStatusChange(key)}
            />
          );
        })}
      </div>

      <AdminPanelCard
        title={
          <>
            {activeMeta.label}
            <span className="font-normal text-muted-foreground"> · {roleLabel}</span>
            <span className="ml-1 font-normal tabular-nums text-muted-foreground">
              ({counts[status]})
            </span>
          </>
        }
      >
        <div className="overflow-x-auto">
          {status === 'email' && <EmailUnconfirmedTable rows={emailUnconfirmed} />}
          {status === 'pending' && <PendingTable rows={pending} />}
          {status === 'rejected' && <RejectedTable rows={rejected} />}
          {status === 'approved' && <ApprovedTable rows={approved} />}
        </div>
      </AdminPanelCard>
    </div>
  );
}

export function VerificationQueueTabs({ pending, rejected, approved }: VerificationQueueTabsProps) {
  const [role, setRole] = useState<RoleFilter>('contractor');
  const [status, setStatus] = useState<StatusFilter>('pending');

  const contractorPending = useMemo(() => filterByRole(pending, 'contractor'), [pending]);
  const contractorRejected = useMemo(() => filterByRole(rejected, 'contractor'), [rejected]);
  const contractorApproved = useMemo(() => filterByRole(approved, 'contractor'), [approved]);

  const managerPending = useMemo(() => filterByRole(pending, 'manager'), [pending]);
  const managerRejected = useMemo(() => filterByRole(rejected, 'manager'), [rejected]);
  const managerApproved = useMemo(() => filterByRole(approved, 'manager'), [approved]);

  const contractorPartitioned = useMemo(() => {
    const pendingSplit = partitionByEmailConfirmation(contractorPending);
    const rejectedSplit = partitionByEmailConfirmation(contractorRejected);
    const approvedSplit = partitionByEmailConfirmation(contractorApproved);

    return {
      emailUnconfirmed: mergeEmailUnconfirmed<QueueRow>(
        pendingSplit.emailUnconfirmed,
        rejectedSplit.emailUnconfirmed,
        approvedSplit.emailUnconfirmed,
      ),
      pending: pendingSplit.confirmed,
      rejected: rejectedSplit.confirmed,
      approved: approvedSplit.confirmed,
    };
  }, [contractorPending, contractorRejected, contractorApproved]);

  const managerPartitioned = useMemo(() => {
    const pendingSplit = partitionByEmailConfirmation(managerPending);
    const rejectedSplit = partitionByEmailConfirmation(managerRejected);
    const approvedSplit = partitionByEmailConfirmation(managerApproved);

    return {
      emailUnconfirmed: mergeEmailUnconfirmed<QueueRow>(
        pendingSplit.emailUnconfirmed,
        rejectedSplit.emailUnconfirmed,
        approvedSplit.emailUnconfirmed,
      ),
      pending: pendingSplit.confirmed,
      rejected: rejectedSplit.confirmed,
      approved: approvedSplit.confirmed,
    };
  }, [managerPending, managerRejected, managerApproved]);

  const activePartition = role === 'contractor' ? contractorPartitioned : managerPartitioned;
  const contractorTotal =
    contractorPartitioned.pending.length +
    contractorPartitioned.emailUnconfirmed.length +
    contractorPartitioned.rejected.length +
    contractorPartitioned.approved.length;
  const managerTotal =
    managerPartitioned.pending.length +
    managerPartitioned.emailUnconfirmed.length +
    managerPartitioned.rejected.length +
    managerPartitioned.approved.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        <AdminFilterChip
          label="Wykonawcy"
          count={contractorTotal}
          icon={HardHat}
          active={role === 'contractor'}
          onClick={() => setRole('contractor')}
        />
        <AdminFilterChip
          label="Zarządcy"
          count={managerTotal}
          icon={Building2}
          active={role === 'manager'}
          onClick={() => setRole('manager')}
        />
      </div>

      <VerificationQueuePanel
        role={role}
        status={status}
        onStatusChange={setStatus}
        emailUnconfirmed={activePartition.emailUnconfirmed}
        pending={activePartition.pending}
        rejected={activePartition.rejected}
        approved={activePartition.approved}
      />
    </div>
  );
}
