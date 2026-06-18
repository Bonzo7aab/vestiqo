'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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

const USER_TYPE_LABELS: Record<string, string> = {
  contractor: 'Wykonawca',
  manager: 'Zarządca',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function formatDocumentsCell(submitted: number, expected: number): string {
  return `${submitted} / ${expected}`;
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

function EmptyRow({ message, colSpan }: { message: string; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

function DetailsLink({ userId }: { userId: string }) {
  return (
    <Link href={`/administracja/weryfikacja/${userId}`} className="text-primary underline">
      Szczegóły
    </Link>
  );
}

function EmailUnconfirmedTable({ rows }: { rows: QueueRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Użytkownik</TableHead>
            <TableHead>Firma</TableHead>
            <TableHead>Typ konta</TableHead>
            <TableHead>Utworzono</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <EmptyRow message="Brak kont oczekujących na potwierdzenie email." colSpan={5} />
          )}
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell className="font-medium">
                {r.firstName} {r.lastName}
              </TableCell>
              <TableCell>{r.companyName ?? '—'}</TableCell>
              <TableCell>{USER_TYPE_LABELS[r.userType] ?? r.userType}</TableCell>
              <TableCell>{formatDate(r.createdAt)}</TableCell>
              <TableCell>
                <DetailsLink userId={r.userId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PendingTable({ rows }: { rows: PendingRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Użytkownik</TableHead>
            <TableHead>Firma</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Wymagane dokumenty</TableHead>
            <TableHead>Rozpoczęta</TableHead>
            <TableHead>Zaktualizowana</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <EmptyRow message="Brak kont oczekujących na weryfikację." colSpan={7} />
          )}
          {rows.map((r) => {
            const verificationState = resolveQueueVerificationState(
              false,
              r.verificationSubmittedAt,
            );
            const displayStatus = resolveAdminUserStatus({
              emailConfirmed: r.emailConfirmed,
              verificationState,
            });

            return (
              <TableRow key={r.userId}>
                <TableCell className="font-medium">
                  {r.firstName} {r.lastName}
                </TableCell>
                <TableCell>{r.companyName ?? '—'}</TableCell>
                <TableCell>
                  <VerificationStatusBadge state={displayStatus} />
                </TableCell>
                <TableCell>{formatDocumentsCell(r.documentsSubmitted, r.documentsExpected)}</TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
                <TableCell>{formatDate(r.updatedAt)}</TableCell>
                <TableCell>
                  <DetailsLink userId={r.userId} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RejectedTable({ rows }: { rows: RejectedRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Użytkownik</TableHead>
            <TableHead>Firma</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Wymagane dokumenty</TableHead>
            <TableHead>Rozpoczęta</TableHead>
            <TableHead>Zaktualizowana</TableHead>
            <TableHead>Odrzucono</TableHead>
            <TableHead>Powód</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow message="Brak odrzuconych weryfikacji." colSpan={9} />}
          {rows.map((r) => {
            const displayStatus = resolveAdminUserStatus({
              emailConfirmed: r.emailConfirmed,
              verificationState: 'rejected',
            });

            return (
              <TableRow key={r.userId}>
                <TableCell className="font-medium">
                  {r.firstName} {r.lastName}
                </TableCell>
                <TableCell>{r.companyName ?? '—'}</TableCell>
                <TableCell>
                  <VerificationStatusBadge state={displayStatus} />
                </TableCell>
                <TableCell>{formatDocumentsCell(r.documentsSubmitted, r.documentsExpected)}</TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
                <TableCell>{formatDate(r.updatedAt)}</TableCell>
                <TableCell>{formatDate(r.decidedAt)}</TableCell>
                <TableCell className="max-w-[280px] whitespace-pre-wrap text-sm text-muted-foreground">
                  {r.reason ?? '—'}
                </TableCell>
                <TableCell>
                  <DetailsLink userId={r.userId} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ApprovedTable({ rows }: { rows: ApprovedRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Użytkownik</TableHead>
            <TableHead>Firma</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Wymagane dokumenty</TableHead>
            <TableHead>Rozpoczęta</TableHead>
            <TableHead>Zaktualizowana</TableHead>
            <TableHead>Zaakceptowano</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow message="Brak zweryfikowanych kont." colSpan={8} />}
          {rows.map((r) => {
            const displayStatus = resolveAdminUserStatus({
              emailConfirmed: r.emailConfirmed,
              verificationState: 'approved',
            });

            return (
              <TableRow key={r.userId}>
                <TableCell className="font-medium">
                  {r.firstName} {r.lastName}
                </TableCell>
                <TableCell>{r.companyName ?? '—'}</TableCell>
                <TableCell>
                  <VerificationStatusBadge state={displayStatus} />
                </TableCell>
                <TableCell>{formatDocumentsCell(r.documentsSubmitted, r.documentsExpected)}</TableCell>
                <TableCell>{formatDate(r.createdAt)}</TableCell>
                <TableCell>{formatDate(r.updatedAt)}</TableCell>
                <TableCell>{formatDate(r.decidedAt)}</TableCell>
                <TableCell>
                  <DetailsLink userId={r.userId} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusTabs({
  emailUnconfirmed,
  pending,
  rejected,
  approved,
}: {
  emailUnconfirmed: QueueRow[];
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
}) {
  return (
    <Tabs defaultValue="pending" className="mt-4">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 md:w-fit">
        <TabsTrigger value="pending">W toku ({pending.length})</TabsTrigger>
        <TabsTrigger value="email">Weryfikacja email ({emailUnconfirmed.length})</TabsTrigger>
        <TabsTrigger value="rejected">Odrzucone ({rejected.length})</TabsTrigger>
        <TabsTrigger value="approved">Zaakceptowane ({approved.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <PendingTable rows={pending} />
      </TabsContent>
      <TabsContent value="email" className="mt-4">
        <EmailUnconfirmedTable rows={emailUnconfirmed} />
      </TabsContent>
      <TabsContent value="rejected" className="mt-4">
        <RejectedTable rows={rejected} />
      </TabsContent>
      <TabsContent value="approved" className="mt-4">
        <ApprovedTable rows={approved} />
      </TabsContent>
    </Tabs>
  );
}

function RoleQueueTabs({
  pending,
  rejected,
  approved,
}: {
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
}) {
  const partitioned = useMemo(() => {
    const pendingSplit = partitionByEmailConfirmation(pending);
    const rejectedSplit = partitionByEmailConfirmation(rejected);
    const approvedSplit = partitionByEmailConfirmation(approved);

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
  }, [pending, rejected, approved]);

  return (
    <StatusTabs
      emailUnconfirmed={partitioned.emailUnconfirmed}
      pending={partitioned.pending}
      rejected={partitioned.rejected}
      approved={partitioned.approved}
    />
  );
}

export function VerificationQueueTabs({ pending, rejected, approved }: VerificationQueueTabsProps) {
  const contractorPending = useMemo(() => filterByRole(pending, 'contractor'), [pending]);
  const contractorRejected = useMemo(() => filterByRole(rejected, 'contractor'), [rejected]);
  const contractorApproved = useMemo(() => filterByRole(approved, 'contractor'), [approved]);

  const managerPending = useMemo(() => filterByRole(pending, 'manager'), [pending]);
  const managerRejected = useMemo(() => filterByRole(rejected, 'manager'), [rejected]);
  const managerApproved = useMemo(() => filterByRole(approved, 'manager'), [approved]);

  const contractorTotal =
    contractorPending.length + contractorRejected.length + contractorApproved.length;
  const managerTotal = managerPending.length + managerRejected.length + managerApproved.length;

  return (
    <Tabs defaultValue="contractor" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-fit">
        <TabsTrigger value="contractor">Wykonawcy ({contractorTotal})</TabsTrigger>
        <TabsTrigger value="manager">Zarządcy ({managerTotal})</TabsTrigger>
      </TabsList>

      <TabsContent value="contractor">
        <RoleQueueTabs
          pending={contractorPending}
          rejected={contractorRejected}
          approved={contractorApproved}
        />
      </TabsContent>

      <TabsContent value="manager">
        <RoleQueueTabs
          pending={managerPending}
          rejected={managerRejected}
          approved={managerApproved}
        />
      </TabsContent>
    </Tabs>
  );
}
