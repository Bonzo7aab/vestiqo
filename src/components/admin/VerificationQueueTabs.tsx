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
import { Avatar, AvatarFallback } from '../ui/avatar';
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
  {
    label: string;
    hint: string;
    icon: typeof Clock3;
    iconClass: string;
    iconWrapClass: string;
    activeClass: string;
  }
> = {
  pending: {
    label: 'Do decyzji',
    hint: 'Email potwierdzony, czeka na akceptację',
    icon: Clock3,
    iconClass: 'text-amber-800',
    iconWrapClass: 'bg-amber-100',
    activeClass: 'border-amber-300/80 bg-amber-50/70',
  },
  email: {
    label: 'Email',
    hint: 'Oczekuje na potwierdzenie adresu',
    icon: Mail,
    iconClass: 'text-sky-800',
    iconWrapClass: 'bg-sky-100',
    activeClass: 'border-sky-300/80 bg-sky-50/70',
  },
  rejected: {
    label: 'Odrzucone',
    hint: 'Wniosek zakończony negatywnie',
    icon: XCircle,
    iconClass: 'text-red-800',
    iconWrapClass: 'bg-red-100',
    activeClass: 'border-red-300/80 bg-red-50/60',
  },
  approved: {
    label: 'Zaakceptowane',
    hint: 'Konto zweryfikowane',
    icon: CheckCircle2,
    iconClass: 'text-emerald-800',
    iconWrapClass: 'bg-emerald-100',
    activeClass: 'border-emerald-300/80 bg-emerald-50/70',
  },
};

const ROLE_META: Record<
  RoleFilter,
  { label: string; shortLabel: string; icon: typeof HardHat }
> = {
  contractor: { label: 'Wykonawcy', shortLabel: 'wykonawców', icon: HardHat },
  manager: { label: 'Zarządcy', shortLabel: 'zarządców', icon: Building2 },
  cooperative: { label: 'Spółdzielnie', shortLabel: 'spółdzielni', icon: Landmark },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;

  const diffInSeconds = Math.floor((Date.now() - parsed) / 1000);
  if (diffInSeconds < 60) return 'przed chwilą';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min temu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} godz. temu`;
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return days === 1 ? '1 dzień temu' : `${days} dni temu`;
  }

  return new Date(parsed).toLocaleDateString('pl-PL', { dateStyle: 'medium' });
}

function userInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
}

function UserIdentityCell({ row }: { row: QueueRow }) {
  const name = `${row.firstName} ${row.lastName}`.trim() || 'Bez nazwy';

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 rounded-lg">
        <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
          {userInitials(row.firstName, row.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{row.email ?? 'Brak adresu email'}</p>
      </div>
    </div>
  );
}

function CompanyCell({ row }: { row: QueueRow }) {
  return (
    <div className="min-w-[10rem] max-w-[18rem]">
      <p className="truncate font-medium text-foreground">{row.companyName ?? '—'}</p>
      <p className="truncate text-xs text-muted-foreground">{resolveUserTypeLabel(row)}</p>
    </div>
  );
}

function TimestampCell({ value }: { value: string | null | undefined }) {
  return (
    <span className="whitespace-nowrap text-muted-foreground" title={formatDate(value)}>
      {formatRelativeTime(value)}
    </span>
  );
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
    <div className="flex min-w-[7.5rem] items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            ratio === 100 ? 'bg-emerald-500' : ratio > 0 ? 'bg-primary' : 'bg-muted-foreground/25',
          )}
          style={{ width: `${ratio}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
        {submitted}/{expected}
      </span>
    </div>
  );
}

const VERIFICATION_DEFAULT_COLUMN_VISIBILITY = {
  userType: false,
  email: false,
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
        accessorFn: (row) =>
          `${row.lastName} ${row.firstName} ${row.firstName} ${row.lastName} ${row.email ?? ''} ${row.companyName ?? ''}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Użytkownik" />,
        cell: ({ row }) => <UserIdentityCell row={row.original} />,
      },
      {
        accessorKey: 'companyName',
        meta: { label: 'Firma' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Firma" />,
        cell: ({ row }) => <CompanyCell row={row.original} />,
      },
      {
        accessorKey: 'userType',
        meta: { label: 'Typ konta' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Typ konta" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{resolveUserTypeLabel(row.original)}</span>
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
        cell: ({ row }) => <TimestampCell value={row.original.createdAt} />,
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
      rowClassName="group hover:bg-muted/40"
      filterColumnId="user"
      filterPlaceholder="Szukaj po nazwisku, firmie lub emailu…"
      showViewOptions
      initialColumnVisibility={VERIFICATION_DEFAULT_COLUMN_VISIBILITY}
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
        cell: ({ row }) => <TimestampCell value={row.original.createdAt} />,
      },
      {
        accessorKey: 'updatedAt',
        meta: { label: 'Zaktualizowana' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zaktualizowana" />,
        cell: ({ row }) => <TimestampCell value={row.original.updatedAt} />,
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
      rowClassName="group hover:bg-muted/40"
      filterColumnId="user"
      filterPlaceholder="Szukaj po nazwisku, firmie lub emailu…"
      showViewOptions
      initialColumnVisibility={{ ...VERIFICATION_DEFAULT_COLUMN_VISIBILITY, createdAt: false }}
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
        cell: ({ row }) => <TimestampCell value={row.original.decidedAt} />,
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
      rowClassName="group hover:bg-muted/40"
      filterColumnId="user"
      filterPlaceholder="Szukaj po nazwisku, firmie lub emailu…"
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
        cell: ({ row }) => <TimestampCell value={row.original.decidedAt} />,
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
      rowClassName="group hover:bg-muted/40"
      filterColumnId="user"
      filterPlaceholder="Szukaj po nazwisku, firmie lub emailu…"
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
  const roleMeta = ROLE_META[role];

  const activeRowsEmpty =
    (status === 'email' && emailUnconfirmed.length === 0) ||
    (status === 'pending' && pending.length === 0) ||
    (status === 'rejected' && rejected.length === 0) ||
    (status === 'approved' && approved.length === 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(STATUS_META) as StatusFilter[]).map((key) => {
          const meta = STATUS_META[key];
          const Icon = meta.icon;
          const active = status === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatusChange(key)}
              aria-pressed={active}
              className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-all',
                'hover:border-primary/25 hover:shadow',
                active ? meta.activeClass : 'border-border/70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg',
                    meta.iconWrapClass,
                    meta.iconClass,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-brand-navy">
                  {counts[key]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{meta.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      <AdminPanelCard
        title={
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span>{activeMeta.label}</span>
            <span className="font-normal text-muted-foreground">
              · {roleMeta.shortLabel}
            </span>
            <span className="font-normal tabular-nums text-muted-foreground">
              ({counts[status]})
            </span>
          </span>
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
    <div className="flex flex-col gap-5">
      {!emailLookupAvailable ? (
        <Alert>
          <AlertTitle>Status email niedostępny</AlertTitle>
          <AlertDescription>
            Brak klucza administracyjnego Supabase — nie da się sprawdzić potwierdzenia email.
            Użytkownicy są pokazani w statusach weryfikacji (Do decyzji / Odrzucone / Zaakceptowane),
            bez osobnej karty Email.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="inline-flex w-full self-start rounded-lg border border-border/70 bg-card p-1 shadow-sm sm:w-auto">
          {(['contractor', 'manager', 'cooperative'] as const).map((key) => {
            const meta = ROLE_META[key];
            const Icon = meta.icon;
            const count =
              key === 'contractor'
                ? contractorTotal
                : key === 'manager'
                  ? managerTotal
                  : cooperativeTotal;
            const active = role === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => selectRole(key)}
                aria-pressed={active}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors sm:flex-none',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
                {meta.label}
                <span
                  className={cn(
                    'tabular-nums text-xs',
                    active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
            ? 'W tym widoku nic nie ma, ale są użytkownicy w innych filtrach. Zmień typ konta lub kartę statusu powyżej.'
            : undefined
        }
      />
    </div>
  );
}
