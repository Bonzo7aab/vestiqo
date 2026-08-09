'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HardHat,
  Landmark,
  Mail,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { DataTable } from '../ui/data-table';
import { DataTableColumnHeader } from '../ui/data-table-column-header';
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
import {
  filterVerificationRowsBySegment,
  type VerificationUserSegment,
} from '../../lib/admin/verification-user-segment';
import {
  hasUsersOutsideCurrentFilter,
  resolveInitialVerificationFilters,
  resolveStatusForSegment,
} from '../../lib/admin/verification-queue-initial-filters';
import {
  ACCOUNT_ROLES,
  getAccountRoleDisplayLabel,
} from '../../lib/profile/account-role-labels';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface QueueRow extends VerificationQueueRowBase {
  emailConfirmed: boolean;
  email: string | null;
}

interface PendingRow extends PendingVerificationRow {
  emailConfirmed: boolean;
  email: string | null;
}

interface RejectedRow extends RejectedVerificationRow {
  emailConfirmed: boolean;
  email: string | null;
}

interface ApprovedRow extends ApprovedVerificationRow {
  emailConfirmed: boolean;
  email: string | null;
}

function resolveUserTypeLabel(row: VerificationQueueRowBase): string {
  if (row.userType === 'contractor') return 'Wykonawca';
  if (
    row.accountRole === ACCOUNT_ROLES.COOPERATIVE_BOARD ||
    row.accountRole === ACCOUNT_ROLES.COOPERATIVE_ADMIN
  ) {
    return getAccountRoleDisplayLabel({
      userType: 'manager',
      accountRole: row.accountRole,
      organizationType: row.organizationType,
      companyType: row.companyType,
    });
  }
  if (row.accountRole) {
    return getAccountRoleDisplayLabel({
      userType: 'manager',
      accountRole: row.accountRole,
      organizationType: row.organizationType,
      companyType: row.companyType,
    });
  }
  return 'Zarządca';
}

interface VerificationQueueTabsProps {
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
  /** False when SUPABASE_SECRET_KEY / SERVICE_ROLE is missing — email status cannot be resolved. */
  emailLookupAvailable?: boolean;
}

type RoleFilter = VerificationUserSegment;
type StatusFilter = 'pending' | 'email' | 'rejected' | 'approved';

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

function filterByRole<T extends VerificationQueueRowBase>(rows: T[], role: RoleFilter): T[] {
  return filterVerificationRowsBySegment(rows, role);
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

const VERIFICATION_DEFAULT_COLUMN_VISIBILITY = {
  documents: false,
} as const;

function navColumn<T extends QueueRow>(): ColumnDef<T> {
  return {
    id: 'nav',
    header: () => null,
    cell: () => (
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

function emailColumn<T extends QueueRow>(): ColumnDef<T> {
  return {
    accessorKey: 'email',
    meta: { label: 'Email' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate text-muted-foreground">
        {row.original.email ?? '—'}
      </span>
    ),
  };
}

function documentsColumn<T extends QueueRow>(): ColumnDef<T> {
  return {
    id: 'documents',
    meta: { label: 'Dokumenty' },
    accessorFn: (row) => row.documentsSubmitted / Math.max(row.documentsExpected, 1),
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dokumenty" />,
    cell: ({ row }) => (
      <DocumentsProgress
        submitted={row.original.documentsSubmitted}
        expected={row.original.documentsExpected}
      />
    ),
  };
}

function useBaseColumns<T extends QueueRow>(): ColumnDef<T>[] {
  return useMemo(
    () => [
      {
        id: 'user',
        meta: { label: 'Użytkownik' },
        accessorFn: (row) => `${row.lastName} ${row.firstName}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Użytkownik" />,
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
        ),
      },
      {
        accessorKey: 'companyName',
        meta: { label: 'Firma' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Firma" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.companyName ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'userType',
        meta: { label: 'Typ konta' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Typ konta" />,
        cell: ({ row }) => (
          <Badge variant="outline">{resolveUserTypeLabel(row.original)}</Badge>
        ),
      },
      emailColumn<T>(),
    ],
    [],
  );
}

function EmailUnconfirmedTable({
  rows,
  onNavigate,
}: {
  rows: QueueRow[];
  onNavigate: (userId: string) => void;
}) {
  const baseColumns = useBaseColumns<QueueRow>();

  const columns = useMemo<ColumnDef<QueueRow>[]>(
    () => [
      ...baseColumns,
      {
        accessorKey: 'createdAt',
        meta: { label: 'Utworzono' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Utworzono" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
      },
      navColumn<QueueRow>(),
    ],
    [baseColumns],
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak kont oczekujących na potwierdzenie email w tej kategorii." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.userId}
      onRowClick={(row) => onNavigate(row.userId)}
      rowClassName="group"
      filterColumnId="user"
      filterPlaceholder="Filtruj użytkowników…"
      showViewOptions
      initialSorting={[{ id: 'createdAt', desc: true }]}
    />
  );
}

function PendingTable({
  rows,
  onNavigate,
}: {
  rows: PendingRow[];
  onNavigate: (userId: string) => void;
}) {
  const baseColumns = useBaseColumns<PendingRow>();

  const columns = useMemo<ColumnDef<PendingRow>[]>(
    () => [
      ...baseColumns,
      {
        id: 'status',
        meta: { label: 'Status' },
        accessorFn: (row) =>
          resolveAdminUserStatus({
            emailConfirmed: row.emailConfirmed,
            verificationState: resolveQueueVerificationState(false, row.verificationSubmittedAt),
          }),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const verificationState = resolveQueueVerificationState(
            false,
            row.original.verificationSubmittedAt,
          );
          const displayStatus = resolveAdminUserStatus({
            emailConfirmed: row.original.emailConfirmed,
            verificationState,
          });
          return <VerificationStatusBadge state={displayStatus} />;
        },
      },
      documentsColumn<PendingRow>(),
      {
        accessorKey: 'createdAt',
        meta: { label: 'Rozpoczęta' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rozpoczęta" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        meta: { label: 'Zaktualizowana' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zaktualizowana" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
        ),
      },
      navColumn<PendingRow>(),
    ],
    [baseColumns],
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak kont oczekujących na weryfikację w tej kategorii." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.userId}
      onRowClick={(row) => onNavigate(row.userId)}
      rowClassName="group"
      filterColumnId="user"
      filterPlaceholder="Filtruj użytkowników…"
      showViewOptions
      initialColumnVisibility={VERIFICATION_DEFAULT_COLUMN_VISIBILITY}
      initialSorting={[{ id: 'updatedAt', desc: true }]}
    />
  );
}

function RejectedTable({
  rows,
  onNavigate,
}: {
  rows: RejectedRow[];
  onNavigate: (userId: string) => void;
}) {
  const baseColumns = useBaseColumns<RejectedRow>();

  const columns = useMemo<ColumnDef<RejectedRow>[]>(
    () => [
      ...baseColumns,
      {
        id: 'status',
        meta: { label: 'Status' },
        accessorFn: () => 'rejected',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const displayStatus = resolveAdminUserStatus({
            emailConfirmed: row.original.emailConfirmed,
            verificationState: 'rejected',
          });
          return <VerificationStatusBadge state={displayStatus} />;
        },
      },
      documentsColumn<RejectedRow>(),
      {
        accessorKey: 'decidedAt',
        meta: { label: 'Odrzucono' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Odrzucono" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.decidedAt)}</span>
        ),
      },
      {
        accessorKey: 'reason',
        meta: { label: 'Powód' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Powód" />,
        cell: ({ row }) => (
          <span
            className="max-w-[240px] truncate text-sm text-muted-foreground"
            title={row.original.reason ?? undefined}
          >
            {row.original.reason ?? '—'}
          </span>
        ),
      },
      navColumn<RejectedRow>(),
    ],
    [baseColumns],
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak odrzuconych weryfikacji w tej kategorii." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.userId}
      onRowClick={(row) => onNavigate(row.userId)}
      rowClassName="group"
      filterColumnId="user"
      filterPlaceholder="Filtruj użytkowników…"
      showViewOptions
      initialColumnVisibility={VERIFICATION_DEFAULT_COLUMN_VISIBILITY}
      initialSorting={[{ id: 'decidedAt', desc: true }]}
    />
  );
}

function ApprovedTable({
  rows,
  onNavigate,
}: {
  rows: ApprovedRow[];
  onNavigate: (userId: string) => void;
}) {
  const baseColumns = useBaseColumns<ApprovedRow>();

  const columns = useMemo<ColumnDef<ApprovedRow>[]>(
    () => [
      ...baseColumns,
      {
        id: 'status',
        meta: { label: 'Status' },
        accessorFn: () => 'approved',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const displayStatus = resolveAdminUserStatus({
            emailConfirmed: row.original.emailConfirmed,
            verificationState: 'approved',
          });
          return <VerificationStatusBadge state={displayStatus} />;
        },
      },
      documentsColumn<ApprovedRow>(),
      {
        accessorKey: 'decidedAt',
        meta: { label: 'Zaakceptowano' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zaakceptowano" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.decidedAt)}</span>
        ),
      },
      navColumn<ApprovedRow>(),
    ],
    [baseColumns],
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak zweryfikowanych kont w tej kategorii." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.userId}
      onRowClick={(row) => onNavigate(row.userId)}
      rowClassName="group"
      filterColumnId="user"
      filterPlaceholder="Filtruj użytkowników…"
      showViewOptions
      initialColumnVisibility={VERIFICATION_DEFAULT_COLUMN_VISIBILITY}
      initialSorting={[{ id: 'decidedAt', desc: true }]}
    />
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
  onNavigate,
  emptyHint,
}: {
  role: RoleFilter;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  emailUnconfirmed: QueueRow[];
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
  onNavigate: (userId: string) => void;
  emptyHint?: string;
}) {
  const counts = {
    pending: pending.length,
    email: emailUnconfirmed.length,
    rejected: rejected.length,
    approved: approved.length,
  };

  const activeMeta = STATUS_META[status];
  const roleLabel =
    role === 'contractor'
      ? 'wykonawców'
      : role === 'cooperative'
        ? 'spółdzielni'
        : 'zarządców';

  const activeRowsEmpty =
    (status === 'email' && emailUnconfirmed.length === 0) ||
    (status === 'pending' && pending.length === 0) ||
    (status === 'rejected' && rejected.length === 0) ||
    (status === 'approved' && approved.length === 0);

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
        {activeRowsEmpty && emptyHint ? (
          <AdminEmptyState message={emptyHint} />
        ) : (
          <>
            {status === 'email' && (
              <EmailUnconfirmedTable rows={emailUnconfirmed} onNavigate={onNavigate} />
            )}
            {status === 'pending' && <PendingTable rows={pending} onNavigate={onNavigate} />}
            {status === 'rejected' && <RejectedTable rows={rejected} onNavigate={onNavigate} />}
            {status === 'approved' && <ApprovedTable rows={approved} onNavigate={onNavigate} />}
          </>
        )}
      </AdminPanelCard>
    </div>
  );
}

export function VerificationQueueTabs({
  pending,
  rejected,
  approved,
  emailLookupAvailable = true,
}: VerificationQueueTabsProps) {
  const router = useRouter();
  const [queueFilters, setQueueFilters] = useState(() =>
    resolveInitialVerificationFilters(pending, rejected, approved),
  );
  const { role, status } = queueFilters;

  const contractorPending = useMemo(() => filterByRole(pending, 'contractor'), [pending]);
  const contractorRejected = useMemo(() => filterByRole(rejected, 'contractor'), [rejected]);
  const contractorApproved = useMemo(() => filterByRole(approved, 'contractor'), [approved]);

  const managerPending = useMemo(() => filterByRole(pending, 'manager'), [pending]);
  const managerRejected = useMemo(() => filterByRole(rejected, 'manager'), [rejected]);
  const managerApproved = useMemo(() => filterByRole(approved, 'manager'), [approved]);

  const cooperativePending = useMemo(() => filterByRole(pending, 'cooperative'), [pending]);
  const cooperativeRejected = useMemo(() => filterByRole(rejected, 'cooperative'), [rejected]);
  const cooperativeApproved = useMemo(() => filterByRole(approved, 'cooperative'), [approved]);

  const selectRole = (nextRole: RoleFilter) => {
    setQueueFilters({
      role: nextRole,
      status: resolveStatusForSegment(nextRole, status, pending, rejected, approved),
    });
  };

  const selectStatus = (nextStatus: StatusFilter) => {
    setQueueFilters((prev) => ({ ...prev, status: nextStatus }));
  };

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

  const cooperativePartitioned = useMemo(() => {
    const pendingSplit = partitionByEmailConfirmation(cooperativePending);
    const rejectedSplit = partitionByEmailConfirmation(cooperativeRejected);
    const approvedSplit = partitionByEmailConfirmation(cooperativeApproved);

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
  }, [cooperativePending, cooperativeRejected, cooperativeApproved]);

  const activePartition =
    role === 'contractor'
      ? contractorPartitioned
      : role === 'cooperative'
        ? cooperativePartitioned
        : managerPartitioned;
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
  const cooperativeTotal =
    cooperativePartitioned.pending.length +
    cooperativePartitioned.emailUnconfirmed.length +
    cooperativePartitioned.rejected.length +
    cooperativePartitioned.approved.length;

  const navigateToUser = (userId: string) => {
    router.push(`/administracja/weryfikacja/${userId}`);
  };

  const usersExistElsewhere = hasUsersOutsideCurrentFilter(
    role,
    status,
    pending,
    rejected,
    approved,
  );

  return (
    <div className="space-y-3">
      {!emailLookupAvailable ? (
        <Alert>
          <AlertTitle>Status email niedostępny</AlertTitle>
          <AlertDescription>
            Brak klucza administracyjnego Supabase — nie da się sprawdzić potwierdzenia email.
            Użytkownicy są pokazani w statusach weryfikacji (W toku / Odrzucone / Zaakceptowane),
            bez osobnej zakładki Email.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        <AdminFilterChip
          label="Wykonawcy"
          count={contractorTotal}
          icon={HardHat}
          active={role === 'contractor'}
          onClick={() => selectRole('contractor')}
        />
        <AdminFilterChip
          label="Zarządcy"
          count={managerTotal}
          icon={Building2}
          active={role === 'manager'}
          onClick={() => selectRole('manager')}
        />
        <AdminFilterChip
          label="Spółdzielnie"
          count={cooperativeTotal}
          icon={Landmark}
          active={role === 'cooperative'}
          onClick={() => selectRole('cooperative')}
        />
      </div>

      <VerificationQueuePanel
        role={role}
        status={status}
        onStatusChange={selectStatus}
        emailUnconfirmed={activePartition.emailUnconfirmed}
        pending={activePartition.pending}
        rejected={activePartition.rejected}
        approved={activePartition.approved}
        onNavigate={navigateToUser}
        emptyHint={
          usersExistElsewhere
            ? 'W tej zakładce nic nie ma, ale są użytkownicy w innych filtrach (np. Zarządcy → Zaakceptowane lub Email). Sprawdź liczniki na przyciskach powyżej.'
            : undefined
        }
      />
    </div>
  );
}
