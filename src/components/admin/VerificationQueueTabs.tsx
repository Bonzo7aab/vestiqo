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
} from '../../lib/database/admin-verification';
import {
  resolveAdminUserStatus,
  resolveQueueVerificationState,
} from '../../lib/admin/resolve-admin-user-status';
import { VerificationStatusBadge } from './VerificationStatusBadge';
import { AdminDeleteUserAccountButton } from './AdminDeleteUserAccountButton';

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
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <EmptyRow message="Brak kont oczekujących na weryfikację." colSpan={8} />
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
            const userLabel = `${r.firstName} ${r.lastName}`.trim();

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
              <TableCell>
                <AdminDeleteUserAccountButton userId={r.userId} userLabel={userLabel} />
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
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow message="Brak odrzuconych weryfikacji." colSpan={10} />}
          {rows.map((r) => {
            const displayStatus = resolveAdminUserStatus({
              emailConfirmed: r.emailConfirmed,
              verificationState: 'rejected',
            });
            const userLabel = `${r.firstName} ${r.lastName}`.trim();

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
              <TableCell>
                <AdminDeleteUserAccountButton userId={r.userId} userLabel={userLabel} />
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
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow message="Brak zweryfikowanych kont." colSpan={9} />}
          {rows.map((r) => {
            const displayStatus = resolveAdminUserStatus({
              emailConfirmed: r.emailConfirmed,
              verificationState: 'approved',
            });
            const userLabel = `${r.firstName} ${r.lastName}`.trim();

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
              <TableCell>
                <AdminDeleteUserAccountButton userId={r.userId} userLabel={userLabel} />
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
  pending,
  rejected,
  approved,
}: {
  pending: PendingRow[];
  rejected: RejectedRow[];
  approved: ApprovedRow[];
}) {
  return (
    <Tabs defaultValue="pending" className="mt-4">
      <TabsList className="grid w-full grid-cols-3 md:w-fit">
        <TabsTrigger value="pending">W toku ({pending.length})</TabsTrigger>
        <TabsTrigger value="rejected">Odrzucone ({rejected.length})</TabsTrigger>
        <TabsTrigger value="approved">Zaakceptowane ({approved.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="mt-4">
        <PendingTable rows={pending} />
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
        <StatusTabs
          pending={contractorPending}
          rejected={contractorRejected}
          approved={contractorApproved}
        />
      </TabsContent>

      <TabsContent value="manager">
        <StatusTabs pending={managerPending} rejected={managerRejected} approved={managerApproved} />
      </TabsContent>
    </Tabs>
  );
}
