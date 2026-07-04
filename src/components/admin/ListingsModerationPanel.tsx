'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { DataTable } from '../ui/data-table';
import { DataTableColumnHeader } from '../ui/data-table-column-header';
import { cn } from '../ui/utils';
import {
  pauseTenderListingAction,
  resumeTenderListingAction,
  updateTenderListingAdminAction,
} from '../../app/administracja/actions';
import type { AdminTenderListingRow } from '../../lib/database/admin-listings';
import { listingEffectiveStatus, listingStatusLabel, statusBadgeClass } from '../../lib/admin/status-labels';
import { getContestWorkflowStatusLabel } from '../../lib/tender-workflow-status';
import { EditableForm, type EditableFormValues, type FormSection } from './EditableForm';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminPanelCard } from './AdminPanelCard';

interface ListingsModerationPanelProps {
  tenders: AdminTenderListingRow[];
}

const TENDER_STATUS_OPTIONS = [
  { value: 'draft', label: listingStatusLabel.draft },
  { value: 'active', label: getContestWorkflowStatusLabel('active') },
  { value: 'paused', label: listingStatusLabel.paused },
  { value: 'evaluation', label: getContestWorkflowStatusLabel('evaluation') },
  { value: 'no_offers', label: getContestWorkflowStatusLabel('no_offers') },
  { value: 'awarded', label: getContestWorkflowStatusLabel('awarded') },
  { value: 'cancelled', label: getContestWorkflowStatusLabel('cancelled') },
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

function ListingStatusBadge({ baseStatus }: { baseStatus: string }) {
  const { label, tone } = listingEffectiveStatus(baseStatus);
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusBadgeClass(tone))}>
      {label}
    </span>
  );
}

export function ListingsModerationPanel({ tenders }: ListingsModerationPanelProps) {
  return (
    <AdminPanelCard
      title={
        <>
          Konkursy
          <span className="ml-1 font-normal tabular-nums text-muted-foreground">({tenders.length})</span>
        </>
      }
    >
      <TenderListingsTable rows={tenders} />
    </AdminPanelCard>
  );
}

function TenderListingsTable({ rows }: { rows: AdminTenderListingRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  const columns = useMemo<ColumnDef<AdminTenderListingRow>[]>(
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
        accessorKey: 'title',
        meta: { label: 'Tytuł' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tytuł" />,
        cell: ({ row }) => (
          <span className="max-w-[320px] truncate font-medium">{row.original.title}</span>
        ),
      },
      {
        id: 'manager',
        meta: { label: 'Zarządca' },
        accessorFn: (row) => row.managerCompanyName ?? row.managerFullName ?? row.managerId,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Zarządca" />,
        cell: ({ row }) => (
          <ManagerCell
            managerFullName={row.original.managerFullName}
            managerCompanyName={row.original.managerCompanyName}
          />
        ),
      },
      {
        id: 'status',
        meta: { label: 'Status' },
        accessorFn: (row) => listingEffectiveStatus(row.status).label,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <ListingStatusBadge baseStatus={row.original.status} />,
      },
      {
        accessorKey: 'bidsCount',
        meta: { label: 'Oferty' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Oferty" />,
        cell: ({ row }) => row.original.bidsCount,
      },
      {
        accessorKey: 'createdAt',
        meta: { label: 'Złożono' },
        header: ({ column }) => <DataTableColumnHeader column={column} title="Złożono" />,
        cell: ({ row }) => formatDate(row.original.createdAt),
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
    return <AdminEmptyState message="Brak konkursów do moderacji." />;
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      expandedRowId={openId}
      expandedRowColSpan={7}
      onRowClick={(row) => setOpenId((current) => (current === row.id ? null : row.id))}
      renderExpandedRow={(row) => <TenderListingDetails row={row} />}
      filterColumnId="title"
      filterPlaceholder="Filtruj konkursy…"
      showViewOptions
      initialColumnVisibility={{ manager: false }}
      initialSorting={[{ id: 'createdAt', desc: true }]}
    />
  );
}

function buildTenderFormSections(): FormSection[] {
  return [
    {
      fields: [
        { key: 'status', label: 'Status', type: 'select', options: TENDER_STATUS_OPTIONS },
        { key: 'currency', label: 'Waluta', type: 'select', options: CURRENCY_OPTIONS },
        { key: 'title', label: 'Tytuł', type: 'text', fullWidth: true },
        { key: 'description', label: 'Opis', type: 'textarea', rows: 5, fullWidth: true },
        { key: 'location', label: 'Lokalizacja', type: 'text', placeholder: 'np. Warszawa, Mokotów' },
        { key: 'address', label: 'Adres', type: 'text', placeholder: 'Ulica i numer' },
        { key: 'estimated_value', label: 'Szacunkowa wartość', type: 'number' },
        { key: 'wadium', label: 'Wadium', type: 'number' },
        { key: 'project_duration', label: 'Czas projektu', type: 'text' },
        { key: 'submission_deadline', label: 'Termin składania ofert', type: 'datetime' },
        { key: 'evaluation_deadline', label: 'Termin oceny', type: 'datetime' },
        {
          key: 'requirements',
          label: 'Wymagania (po jednym w linii)',
          type: 'string-array',
          rows: 4,
          fullWidth: true,
        },
      ],
    },
    {
      title: 'Metadane',
      fields: [
        { key: 'id', label: 'ID konkursu', type: 'text', readOnly: true, fullWidth: true },
        { key: 'manager_name', label: 'Zarządca', type: 'text', readOnly: true },
        { key: 'bids_count', label: 'Liczba ofert', type: 'number', readOnly: true },
        { key: 'created_at', label: 'Złożono', type: 'datetime', readOnly: true },
        { key: 'updated_at', label: 'Zaktualizowano', type: 'datetime', readOnly: true },
      ],
    },
  ];
}

function TenderListingDetails({ row }: { row: AdminTenderListingRow }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const sections = useMemo(() => buildTenderFormSections(), []);

  const managerDisplay =
    row.managerCompanyName && row.managerFullName
      ? `${row.managerCompanyName} (${row.managerFullName})`
      : row.managerCompanyName ?? row.managerFullName ?? '—';

  const initialValues = useMemo<EditableFormValues>(
    () => ({
      status: row.status,
      currency: row.currency ?? 'PLN',
      title: row.title,
      description: row.description,
      location: row.location,
      address: row.address,
      estimated_value: row.estimatedValue,
      wadium: row.wadium,
      project_duration: row.projectDuration,
      submission_deadline: row.submissionDeadline,
      evaluation_deadline: row.evaluationDeadline,
      requirements: row.requirements,
      id: row.id,
      manager_name: managerDisplay,
      bids_count: row.bidsCount,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }),
    [
      row.id,
      row.status,
      row.currency,
      row.title,
      row.description,
      row.location,
      row.address,
      row.estimatedValue,
      row.wadium,
      row.projectDuration,
      row.submissionDeadline,
      row.evaluationDeadline,
      row.requirements,
      row.bidsCount,
      row.createdAt,
      row.updatedAt,
      managerDisplay,
    ],
  );

  const onSave = async (patch: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await updateTenderListingAdminAction(row.id, patch);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd zapisu');
        return false;
      }
      toast.success('Zapisano zmiany');
      setEditOpen(false);
      router.refresh();
      window.location.reload();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd zapisu');
      return false;
    }
  };

  const pause = async () => {
    setBusy(true);
    try {
      const res = await pauseTenderListingAction(row.id, msg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Konkurs wstrzymany');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const updateMessage = async () => {
    setBusy(true);
    try {
      const res = await pauseTenderListingAction(row.id, msg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Zaktualizowano wiadomość');
    } finally {
      setBusy(false);
    }
  };

  const resume = async () => {
    setBusy(true);
    try {
      const res = await resumeTenderListingAction(row.id);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Konkurs aktywny');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant={suspendOpen ? 'secondary' : 'outline'}
            className={
              suspendOpen
                ? undefined
                : 'border-destructive/40 text-destructive hover:bg-destructive/5'
            }
            disabled={busy}
            onClick={() => setSuspendOpen((open) => !open)}
          >
            {suspendOpen ? 'Anuluj' : 'Zawieś konkurs'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editOpen ? 'secondary' : 'outline'}
            disabled={busy}
            onClick={() => setEditOpen((open) => !open)}
          >
            {editOpen ? (
              'Anuluj'
            ) : (
              <>
                <Pencil />
                Edytuj
              </>
            )}
          </Button>
        </div>
        {suspendOpen ? (
          <PauseListingSection
            paused={row.status === 'paused'}
            msg={msg}
            setMsg={setMsg}
            onPause={pause}
            onUpdateMessage={updateMessage}
            onResume={resume}
            busy={busy}
          />
        ) : null}
      </div>
      <EditableForm
        key={`${row.id}-${row.updatedAt ?? ''}`}
        sections={sections}
        initialValues={initialValues}
        onSave={onSave}
        busy={busy}
        editing={editOpen}
      />
    </div>
  );
}

function ManagerCell({
  managerFullName,
  managerCompanyName,
}: {
  managerFullName: string | null;
  managerCompanyName: string | null;
}) {
  const primary = managerCompanyName ?? managerFullName ?? '—';
  const secondary = managerCompanyName && managerFullName ? managerFullName : null;
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate font-medium">{primary}</div>
      {secondary && <div className="truncate text-xs text-muted-foreground">{secondary}</div>}
    </div>
  );
}

interface PauseListingSectionProps {
  paused: boolean;
  msg: string;
  setMsg: (value: string) => void;
  onPause: () => void;
  onUpdateMessage: () => void;
  onResume: () => void;
  busy: boolean;
}

function PauseListingSection({
  paused,
  msg,
  setMsg,
  onPause,
  onUpdateMessage,
  onResume,
  busy,
}: PauseListingSectionProps) {
  const actionButtons = paused ? (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy || msg.trim().length === 0}
        onClick={onUpdateMessage}
      >
        Aktualizuj wiadomość
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onResume}>
        Wznów konkurs
      </Button>
    </>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={busy || msg.trim().length === 0}
      onClick={onPause}
    >
      Potwierdź zawieszenie
    </Button>
  );

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Wiadomość do zarządcy{paused ? '' : ' (wymagana)'}
            </div>
            {paused ? (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
                Zawieszone
              </span>
            ) : null}
          </div>
          {paused ? (
            <p className="text-xs text-muted-foreground">
              Konkurs jest obecnie zawieszone. Wyślij zaktualizowaną wiadomość lub wznów ogłoszenie.
            </p>
          ) : null}
          <Textarea
            className="min-h-[72px] bg-background"
            placeholder="Co należy poprawić w ogłoszeniu…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:pb-0.5">{actionButtons}</div>
      </div>
    </div>
  );
}
