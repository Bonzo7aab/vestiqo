'use client';

import React, { useMemo, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Briefcase, ChevronDown, ChevronRight, Gavel } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { DataTable } from '../ui/data-table';
import { DataTableColumnHeader } from '../ui/data-table-column-header';
import { cn } from '../ui/utils';
import {
  suspendJobApplicationAction,
  suspendTenderBidAction,
  unsuspendJobApplicationAction,
  unsuspendTenderBidAction,
  updateJobApplicationAdminAction,
  updateTenderBidAdminAction,
} from '../../app/administracja/actions';
import type { AdminJobApplicationRow, AdminTenderBidRow } from '../../lib/database/admin-offers';
import { offerEffectiveStatus, statusBadgeClass } from '../../lib/admin/status-labels';
import { EditableForm, type FormSection } from './EditableForm';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminFilterChip } from './AdminFilterChip';
import { AdminPanelCard } from './AdminPanelCard';

interface OffersModerationPanelProps {
  applications: AdminJobApplicationRow[];
  bids: AdminTenderBidRow[];
}

const OFFER_STATUS_OPTIONS = [
  { value: 'submitted', label: 'Złożona' },
  { value: 'under_review', label: 'W ocenie' },
  { value: 'shortlisted', label: 'Krótka lista' },
  { value: 'accepted', label: 'Zaakceptowana' },
  { value: 'rejected', label: 'Odrzucona' },
  { value: 'cancelled', label: 'Anulowana' },
];

const CURRENCY_OPTIONS = [
  { value: 'PLN', label: 'PLN' },
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return value;
  }
}

function StatusBadge({ baseStatus, adminModerationStatus }: { baseStatus: string; adminModerationStatus: string }) {
  const { label, tone } = offerEffectiveStatus(baseStatus, adminModerationStatus);
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusBadgeClass(tone))}>
      {label}
    </span>
  );
}

type OfferView = 'job' | 'tender';

export function OffersModerationPanel({ applications, bids }: OffersModerationPanelProps) {
  const [view, setView] = useState<OfferView>('job');
  const activeCount = view === 'job' ? applications.length : bids.length;
  const activeLabel = view === 'job' ? 'Oferty na zgłoszenia' : 'Oferty przetargowe';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        <AdminFilterChip
          label="Na zgłoszenia"
          count={applications.length}
          icon={Briefcase}
          active={view === 'job'}
          onClick={() => setView('job')}
        />
        <AdminFilterChip
          label="Przetargowe"
          count={bids.length}
          icon={Gavel}
          active={view === 'tender'}
          onClick={() => setView('tender')}
        />
      </div>

      <AdminPanelCard
        title={
          <>
            {activeLabel}
            <span className="ml-1 font-normal tabular-nums text-muted-foreground">
              ({activeCount})
            </span>
          </>
        }
      >
        {view === 'job' ? (
          <JobApplicationsTable rows={applications} />
        ) : (
          <TenderBidsTable rows={bids} />
        )}
      </AdminPanelCard>
    </div>
  );
}

function JobApplicationsTable({ rows }: { rows: AdminJobApplicationRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  const columns = useMemo<ColumnDef<AdminJobApplicationRow>[]>(
    () => [
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {openId === row.original.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'listing',
        meta: { label: 'Zgłoszenie' },
        accessorFn: (row) => row.jobTitle ?? row.jobId,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zgłoszenie" />,
        cell: ({ row }) => (
          <span className="max-w-[260px] truncate font-medium">
            {row.original.jobTitle ?? row.original.jobId}
          </span>
        ),
      },
      {
        accessorKey: 'companyName',
        meta: { label: 'Wykonawca' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Wykonawca" />,
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate">{row.original.companyName ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        meta: { label: 'Status' },
        accessorFn: (row) => offerEffectiveStatus(row.status, row.adminModerationStatus).label,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <StatusBadge
            baseStatus={row.original.status}
            adminModerationStatus={row.original.adminModerationStatus}
          />
        ),
      },
      {
        id: 'amount',
        meta: { label: 'Kwota' },
        accessorFn: (row) => row.proposedPrice ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kwota" />,
        cell: ({ row }) =>
          row.original.proposedPrice != null
            ? `${row.original.proposedPrice} ${row.original.currency ?? 'PLN'}`
            : '—',
      },
      {
        accessorKey: 'submittedAt',
        meta: { label: 'Złożono' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Złożono" />,
        cell: ({ row }) => formatDate(row.original.submittedAt),
      },
      {
        accessorKey: 'updatedAt',
        meta: { label: 'Zaktualizowano' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zaktualizowano" />,
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
    ],
    [openId],
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak ofert na zgłoszenia do moderacji." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      expandedRowId={openId}
      expandedRowColSpan={7}
      onRowClick={(row) => setOpenId((current) => (current === row.id ? null : row.id))}
      renderExpandedRow={(row) => <JobApplicationDetails row={row} />}
      filterColumnId="listing"
      filterPlaceholder="Filtruj zgłoszenia…"
      showViewOptions
      initialSorting={[{ id: 'submittedAt', desc: true }]}
    />
  );
}

function JobApplicationDetails({ row }: { row: AdminJobApplicationRow }) {
  const [suspendMsg, setSuspendMsg] = React.useState(row.adminFeedbackMessage ?? '');
  const [busy, setBusy] = React.useState(false);

  const sections: FormSection[] = [
    {
      fields: [
        { key: 'status', label: 'Status', type: 'select', options: OFFER_STATUS_OPTIONS },
        { key: 'currency', label: 'Waluta', type: 'select', options: CURRENCY_OPTIONS },
        { key: 'proposed_price', label: 'Kwota oferty', type: 'number' },
        { key: 'proposed_timeline', label: 'Czas realizacji (dni)', type: 'number' },
        { key: 'proposed_start_date', label: 'Proponowana data startu', type: 'date' },
        { key: 'available_from', label: 'Dostępność od', type: 'date' },
        { key: 'cover_letter', label: 'List motywacyjny', type: 'textarea', rows: 5, fullWidth: true },
        { key: 'notes', label: 'Notatki', type: 'textarea', rows: 3, fullWidth: true },
      ],
    },
  ];

  const initialValues = {
    status: row.status,
    currency: row.currency,
    proposed_price: row.proposedPrice,
    proposed_timeline: row.proposedTimeline,
    proposed_start_date: row.proposedStartDate,
    available_from: row.availableFrom,
    cover_letter: row.coverLetter,
    notes: row.notes,
  };

  const onSave = async (patch: Record<string, unknown>): Promise<boolean> => {
    const res = await updateJobApplicationAdminAction(row.id, patch);
    if (!res.ok) {
      toast.error(res.error ?? 'Błąd zapisu');
      return false;
    }
    toast.success('Zapisano zmiany');
    return true;
  };

  const suspend = async () => {
    setBusy(true);
    try {
      const res = await suspendJobApplicationAction(row.id, suspendMsg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Oferta zawieszona');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const updateMessage = async () => {
    setBusy(true);
    try {
      const res = await suspendJobApplicationAction(row.id, suspendMsg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Zaktualizowano wiadomość');
    } finally {
      setBusy(false);
    }
  };

  const unsuspend = async () => {
    setBusy(true);
    try {
      const res = await unsuspendJobApplicationAction(row.id);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Wznowiono ofertę');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <ContractorMetaBlock companyName={row.companyName} contractorId={row.contractorId} jobTitle={row.jobTitle} />
        <EditableForm sections={sections} initialValues={initialValues} onSave={onSave} busy={busy} />
        {row.attachments != null && <AttachmentsBlock data={row.attachments} />}
      </div>
      <SuspendOfferSection
        suspended={row.adminModerationStatus === 'suspended'}
        suspendMsg={suspendMsg}
        setSuspendMsg={setSuspendMsg}
        onSuspend={suspend}
        onUpdateMessage={updateMessage}
        onUnsuspend={unsuspend}
        busy={busy}
      />
    </div>
  );
}

function TenderBidsTable({ rows }: { rows: AdminTenderBidRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  const columns = useMemo<ColumnDef<AdminTenderBidRow>[]>(
    () => [
      {
        id: 'expand',
        header: () => null,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {openId === row.original.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'listing',
        meta: { label: 'Przetarg' },
        accessorFn: (row) => row.tenderTitle ?? row.tenderId,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Przetarg" />,
        cell: ({ row }) => (
          <span className="max-w-[260px] truncate font-medium">
            {row.original.tenderTitle ?? row.original.tenderId}
          </span>
        ),
      },
      {
        accessorKey: 'companyName',
        meta: { label: 'Wykonawca' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Wykonawca" />,
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate">{row.original.companyName ?? '—'}</span>
        ),
      },
      {
        id: 'status',
        meta: { label: 'Status' },
        accessorFn: (row) => offerEffectiveStatus(row.status, row.adminModerationStatus).label,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <StatusBadge
            baseStatus={row.original.status}
            adminModerationStatus={row.original.adminModerationStatus}
          />
        ),
      },
      {
        id: 'amount',
        meta: { label: 'Kwota' },
        accessorFn: (row) => row.bidAmount ?? 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Kwota" />,
        cell: ({ row }) =>
          row.original.bidAmount != null
            ? `${row.original.bidAmount} ${row.original.currency ?? 'PLN'}`
            : '—',
      },
      {
        accessorKey: 'submittedAt',
        meta: { label: 'Złożono' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Złożono" />,
        cell: ({ row }) => formatDate(row.original.submittedAt),
      },
      {
        accessorKey: 'updatedAt',
        meta: { label: 'Zaktualizowano' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zaktualizowano" />,
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
    ],
    [openId],
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak ofert przetargowych do moderacji." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      expandedRowId={openId}
      expandedRowColSpan={7}
      onRowClick={(row) => setOpenId((current) => (current === row.id ? null : row.id))}
      renderExpandedRow={(row) => <TenderBidDetails row={row} />}
      filterColumnId="listing"
      filterPlaceholder="Filtruj przetargi…"
      showViewOptions
      initialSorting={[{ id: 'submittedAt', desc: true }]}
    />
  );
}

function TenderBidDetails({ row }: { row: AdminTenderBidRow }) {
  const [suspendMsg, setSuspendMsg] = React.useState(row.adminFeedbackMessage ?? '');
  const [busy, setBusy] = React.useState(false);

  const sections: FormSection[] = [
    {
      fields: [
        { key: 'status', label: 'Status', type: 'select', options: OFFER_STATUS_OPTIONS },
        { key: 'currency', label: 'Waluta', type: 'select', options: CURRENCY_OPTIONS },
        { key: 'bid_amount', label: 'Kwota oferty', type: 'number' },
        { key: 'proposed_timeline', label: 'Czas realizacji (dni)', type: 'number' },
        { key: 'evaluation_score', label: 'Wynik oceny (0–100)', type: 'number' },
        { key: 'proposed_start_date', label: 'Proponowana data startu', type: 'date' },
        { key: 'valid_until', label: 'Ważne do', type: 'date' },
        { key: 'technical_proposal', label: 'Propozycja techniczna', type: 'textarea', rows: 5, fullWidth: true },
        { key: 'financial_proposal', label: 'Propozycja finansowa', type: 'textarea', rows: 4, fullWidth: true },
        { key: 'team_description', label: 'Opis zespołu', type: 'textarea', rows: 3, fullWidth: true },
        { key: 'evaluation_notes', label: 'Notatki z oceny', type: 'textarea', rows: 3, fullWidth: true },
      ],
    },
  ];

  const initialValues = {
    status: row.status,
    currency: row.currency,
    bid_amount: row.bidAmount,
    proposed_timeline: row.proposedTimeline,
    evaluation_score: row.evaluationScore,
    proposed_start_date: row.proposedStartDate,
    valid_until: row.validUntil,
    technical_proposal: row.technicalProposal,
    financial_proposal: row.financialProposal,
    team_description: row.teamDescription,
    evaluation_notes: row.evaluationNotes,
  };

  const onSave = async (patch: Record<string, unknown>): Promise<boolean> => {
    const res = await updateTenderBidAdminAction(row.id, patch);
    if (!res.ok) {
      toast.error(res.error ?? 'Błąd zapisu');
      return false;
    }
    toast.success('Zapisano zmiany');
    return true;
  };

  const suspend = async () => {
    setBusy(true);
    try {
      const res = await suspendTenderBidAction(row.id, suspendMsg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Oferta zawieszona');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const updateMessage = async () => {
    setBusy(true);
    try {
      const res = await suspendTenderBidAction(row.id, suspendMsg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Zaktualizowano wiadomość');
    } finally {
      setBusy(false);
    }
  };

  const unsuspend = async () => {
    setBusy(true);
    try {
      const res = await unsuspendTenderBidAction(row.id);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Wznowiono ofertę');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <ContractorMetaBlock companyName={row.companyName} contractorId={row.contractorId} jobTitle={row.tenderTitle} />
        <EditableForm sections={sections} initialValues={initialValues} onSave={onSave} busy={busy} />
        {row.attachments != null && <AttachmentsBlock data={row.attachments} />}
      </div>
      <SuspendOfferSection
        suspended={row.adminModerationStatus === 'suspended'}
        suspendMsg={suspendMsg}
        setSuspendMsg={setSuspendMsg}
        onSuspend={suspend}
        onUpdateMessage={updateMessage}
        onUnsuspend={unsuspend}
        busy={busy}
      />
    </div>
  );
}

function ContractorMetaBlock({
  companyName,
  contractorId,
  jobTitle,
}: {
  companyName: string | null;
  contractorId: string;
  jobTitle: string | null;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Wykonawca</div>
          <div className="font-medium">{companyName ?? '—'}</div>
          <div className="font-mono text-xs text-muted-foreground">{contractorId}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Ogłoszenie</div>
          <div className="font-medium">{jobTitle ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}

function AttachmentsBlock({ data }: { data: unknown }) {
  return (
    <details className="rounded-lg border bg-background p-3 text-xs">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Załączniki (JSON)
      </summary>
      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

interface SuspendOfferSectionProps {
  suspended: boolean;
  suspendMsg: string;
  setSuspendMsg: (value: string) => void;
  onSuspend: () => void;
  onUpdateMessage: () => void;
  onUnsuspend: () => void;
  busy: boolean;
}

function SuspendOfferSection({
  suspended,
  suspendMsg,
  setSuspendMsg,
  onSuspend,
  onUpdateMessage,
  onUnsuspend,
  busy,
}: SuspendOfferSectionProps) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-destructive">Zawieś ofertę</div>
        {suspended && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
            Zawieszona
          </span>
        )}
      </div>
      <div className="space-y-2">
        {suspended && (
          <p className="text-xs text-muted-foreground">
            Oferta jest obecnie zawieszona. Zaktualizuj wiadomość lub cofnij zawieszenie.
          </p>
        )}
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Wiadomość do wykonawcy{suspended ? '' : ' (wymagana)'}
        </label>
        <Textarea
          className="min-h-[120px] bg-background"
          placeholder="Co należy poprawić w ofercie…"
          value={suspendMsg}
          onChange={(e) => setSuspendMsg(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {suspended ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy || suspendMsg.trim().length === 0}
                onClick={onUpdateMessage}
              >
                Aktualizuj wiadomość
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onUnsuspend}>
                Cofnij zawieszenie
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy || suspendMsg.trim().length === 0}
              onClick={onSuspend}
            >
              Zawieś ofertę
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
