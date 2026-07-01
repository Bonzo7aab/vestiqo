'use client';

import React, { useState } from 'react';
import { Briefcase, ChevronDown, ChevronRight, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';
import {
  pauseJobListingAction,
  pauseTenderListingAction,
  resumeJobListingAction,
  resumeTenderListingAction,
  updateJobListingAdminAction,
  updateTenderListingAdminAction,
} from '../../app/administracja/actions';
import type {
  AdminJobListingRow,
  AdminTenderListingRow,
} from '../../lib/database/admin-listings';
import { listingEffectiveStatus, statusBadgeClass } from '../../lib/admin/status-labels';
import { SortableHeader, type SortState } from './SortableHeader';
import { EditableForm, type FormSection } from './EditableForm';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminFilterChip } from './AdminFilterChip';
import { AdminPanelCard } from './AdminPanelCard';

interface ListingsModerationPanelProps {
  jobs: AdminJobListingRow[];
  tenders: AdminTenderListingRow[];
}

type ListingSortKey = 'status' | 'createdAt' | 'updatedAt';

const JOB_STATUS_OPTIONS = [
  { value: 'draft', label: 'Szkic' },
  { value: 'active', label: 'Aktywne' },
  { value: 'paused', label: 'Zawieszone' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'cancelled', label: 'Anulowane' },
];

const TENDER_STATUS_OPTIONS = [
  { value: 'draft', label: 'Szkic' },
  { value: 'active', label: 'Aktywne' },
  { value: 'paused', label: 'Zawieszone' },
  { value: 'evaluation', label: 'Ocena' },
  { value: 'awarded', label: 'Przyznane' },
  { value: 'cancelled', label: 'Anulowane' },
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Niski' },
  { value: 'medium', label: 'Średni' },
  { value: 'high', label: 'Wysoki' },
];

const JOB_TYPE_OPTIONS = [
  { value: 'regular', label: 'Standardowy' },
  { value: 'urgent', label: 'Pilny' },
  { value: 'premium', label: 'Premium' },
];

const BUDGET_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Stały' },
  { value: 'hourly', label: 'Godzinowy' },
  { value: 'negotiable', label: 'Do negocjacji' },
  { value: 'range', label: 'Widełki' },
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

function compareString(a: string | null | undefined, b: string | null | undefined): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function applyListingSort<TRow>(
  rows: TRow[],
  sort: SortState<ListingSortKey> | null,
  effectiveStatusLabel: (row: TRow) => string,
  createdAt: (row: TRow) => string | null,
  updatedAt: (row: TRow) => string | null
): TRow[] {
  if (!sort) return rows;
  const dir = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sort.key) {
      case 'status':
        cmp = compareString(effectiveStatusLabel(a), effectiveStatusLabel(b));
        break;
      case 'createdAt':
        cmp = compareString(createdAt(a), createdAt(b));
        break;
      case 'updatedAt':
        cmp = compareString(updatedAt(a), updatedAt(b));
        break;
    }
    return cmp * dir;
  });
  return sorted;
}

function ListingStatusBadge({ baseStatus }: { baseStatus: string }) {
  const { label, tone } = listingEffectiveStatus(baseStatus);
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusBadgeClass(tone))}>
      {label}
    </span>
  );
}

type ListingView = 'job' | 'tender';

export function ListingsModerationPanel({ jobs, tenders }: ListingsModerationPanelProps) {
  const [view, setView] = useState<ListingView>('job');
  const activeCount = view === 'job' ? jobs.length : tenders.length;
  const activeLabel = view === 'job' ? 'Zgłoszenia' : 'Przetargi';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1">
        <AdminFilterChip
          label="Zgłoszenia"
          count={jobs.length}
          icon={Briefcase}
          active={view === 'job'}
          onClick={() => setView('job')}
        />
        <AdminFilterChip
          label="Przetargi"
          count={tenders.length}
          icon={Landmark}
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
        <div className="overflow-x-auto">
          {view === 'job' ? <JobListingsTable rows={jobs} /> : <TenderListingsTable rows={tenders} />}
        </div>
      </AdminPanelCard>
    </div>
  );
}

function JobListingsTable({ rows }: { rows: AdminJobListingRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<SortState<ListingSortKey> | null>({ key: 'createdAt', direction: 'desc' });

  const sorted = React.useMemo(
    () =>
      applyListingSort(
        rows,
        sort,
        (r) => listingEffectiveStatus(r.status).label,
        (r) => r.createdAt,
        (r) => r.updatedAt
      ),
    [rows, sort]
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak zgłoszeń do moderacji." />;
  }

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Tytuł</TableHead>
            <TableHead>Zarządca</TableHead>
            <TableHead>
              <SortableHeader<ListingSortKey>
                label="Status"
                sortKey="status"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
            <TableHead>Oferty</TableHead>
            <TableHead>
              <SortableHeader<ListingSortKey>
                label="Złożono"
                sortKey="createdAt"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader<ListingSortKey>
                label="Zaktualizowano"
                sortKey="updatedAt"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isOpen = openId === row.id;
            return (
              <React.Fragment key={row.id}>
                <TableRow
                  className="cursor-pointer"
                  data-state={isOpen ? 'selected' : undefined}
                  onClick={() => setOpenId(isOpen ? null : row.id)}
                >
                  <TableCell className="text-muted-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate font-medium">{row.title}</TableCell>
                  <TableCell className="max-w-[220px]">
                    <ManagerCell
                      managerId={row.managerId}
                      managerFullName={row.managerFullName}
                      managerCompanyName={row.managerCompanyName}
                    />
                  </TableCell>
                  <TableCell>
                    <ListingStatusBadge baseStatus={row.status} />
                  </TableCell>
                  <TableCell>{row.applicationsCount}</TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>{formatDate(row.updatedAt)}</TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell />
                    <TableCell colSpan={6} className="whitespace-normal py-4 align-top">
                      <JobListingDetails row={row} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
  );
}

function JobListingDetails({ row }: { row: AdminJobListingRow }) {
  const [msg, setMsg] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const sections: FormSection[] = [
    {
      fields: [
        { key: 'status', label: 'Status', type: 'select', options: JOB_STATUS_OPTIONS },
        { key: 'type', label: 'Typ', type: 'select', options: JOB_TYPE_OPTIONS },
        { key: 'urgency', label: 'Pilność', type: 'select', options: URGENCY_OPTIONS },
        { key: 'deadline', label: 'Termin', type: 'date' },
        { key: 'title', label: 'Tytuł', type: 'text', fullWidth: true },
        { key: 'description', label: 'Opis', type: 'textarea', rows: 5, fullWidth: true },
        { key: 'location', label: 'Lokalizacja', type: 'text' },
        { key: 'address', label: 'Adres', type: 'text' },
        { key: 'budget_type', label: 'Typ budżetu', type: 'select', options: BUDGET_TYPE_OPTIONS },
        { key: 'currency', label: 'Waluta', type: 'select', options: CURRENCY_OPTIONS },
        { key: 'budget_min', label: 'Budżet min.', type: 'number' },
        { key: 'budget_max', label: 'Budżet maks.', type: 'number' },
        { key: 'contact_person', label: 'Osoba kontaktowa', type: 'text' },
        { key: 'contact_phone', label: 'Telefon', type: 'text' },
        { key: 'contact_email', label: 'E-mail', type: 'text' },
        { key: 'additional_info', label: 'Dodatkowe informacje', type: 'textarea', rows: 3, fullWidth: true },
        {
          key: 'requirements',
          label: 'Wymagania (po jednym w linii)',
          type: 'string-array',
          rows: 4,
          fullWidth: true,
        },
      ],
    },
  ];

  const initialValues = {
    status: row.status,
    type: row.type,
    urgency: row.urgency,
    title: row.title,
    description: row.description,
    location: row.location,
    address: row.address,
    budget_type: row.budgetType,
    currency: row.currency,
    budget_min: row.budgetMin,
    budget_max: row.budgetMax,
    deadline: row.deadline,
    contact_person: row.contactPerson,
    contact_phone: row.contactPhone,
    contact_email: row.contactEmail,
    additional_info: row.additionalInfo,
    requirements: row.requirements,
  };

  const onSave = async (patch: Record<string, unknown>): Promise<boolean> => {
    const res = await updateJobListingAdminAction(row.id, patch);
    if (!res.ok) {
      toast.error(res.error ?? 'Błąd zapisu');
      return false;
    }
    toast.success('Zapisano zmiany');
    return true;
  };

  const pause = async () => {
    setBusy(true);
    try {
      const res = await pauseJobListingAction(row.id, msg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Zgłoszenie wstrzymane');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const updateMessage = async () => {
    setBusy(true);
    try {
      const res = await pauseJobListingAction(row.id, msg);
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
      const res = await resumeJobListingAction(row.id);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Zgłoszenie aktywne');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <ManagerMetaBlock
          managerId={row.managerId}
          managerFullName={row.managerFullName}
          managerCompanyName={row.managerCompanyName}
          count={row.applicationsCount}
          countLabel="Liczba ofert"
        />
        <EditableForm sections={sections} initialValues={initialValues} onSave={onSave} busy={busy} />
      </div>
      <PauseListingSection
        kind="job"
        paused={row.status === 'paused'}
        msg={msg}
        setMsg={setMsg}
        onPause={pause}
        onUpdateMessage={updateMessage}
        onResume={resume}
        busy={busy}
      />
    </div>
  );
}

function TenderListingsTable({ rows }: { rows: AdminTenderListingRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<SortState<ListingSortKey> | null>({ key: 'createdAt', direction: 'desc' });

  const sorted = React.useMemo(
    () =>
      applyListingSort(
        rows,
        sort,
        (r) => listingEffectiveStatus(r.status).label,
        (r) => r.createdAt,
        (r) => r.updatedAt
      ),
    [rows, sort]
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak przetargów do moderacji." />;
  }

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Tytuł</TableHead>
            <TableHead>Zarządca</TableHead>
            <TableHead>
              <SortableHeader<ListingSortKey>
                label="Status"
                sortKey="status"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
            <TableHead>Oferty</TableHead>
            <TableHead>
              <SortableHeader<ListingSortKey>
                label="Złożono"
                sortKey="createdAt"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader<ListingSortKey>
                label="Zaktualizowano"
                sortKey="updatedAt"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isOpen = openId === row.id;
            return (
              <React.Fragment key={row.id}>
                <TableRow
                  className="cursor-pointer"
                  data-state={isOpen ? 'selected' : undefined}
                  onClick={() => setOpenId(isOpen ? null : row.id)}
                >
                  <TableCell className="text-muted-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate font-medium">{row.title}</TableCell>
                  <TableCell className="max-w-[220px]">
                    <ManagerCell
                      managerId={row.managerId}
                      managerFullName={row.managerFullName}
                      managerCompanyName={row.managerCompanyName}
                    />
                  </TableCell>
                  <TableCell>
                    <ListingStatusBadge baseStatus={row.status} />
                  </TableCell>
                  <TableCell>{row.bidsCount}</TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>{formatDate(row.updatedAt)}</TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell />
                    <TableCell colSpan={6} className="whitespace-normal py-4 align-top">
                      <TenderListingDetails row={row} />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
  );
}

function TenderListingDetails({ row }: { row: AdminTenderListingRow }) {
  const [msg, setMsg] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const sections: FormSection[] = [
    {
      title: 'Podstawowe',
      fields: [
        { key: 'status', label: 'Status', type: 'select', options: TENDER_STATUS_OPTIONS },
        { key: 'currency', label: 'Waluta', type: 'select', options: CURRENCY_OPTIONS },
        { key: 'title', label: 'Tytuł', type: 'text', fullWidth: true },
        { key: 'description', label: 'Opis', type: 'textarea', rows: 5, fullWidth: true },
      ],
    },
    {
      title: 'Lokalizacja',
      fields: [
        { key: 'location', label: 'Lokalizacja', type: 'text' },
        { key: 'address', label: 'Adres', type: 'text' },
      ],
    },
    {
      title: 'Wartość i terminy',
      fields: [
        { key: 'estimated_value', label: 'Szacunkowa wartość', type: 'number' },
        { key: 'wadium', label: 'Wadium', type: 'number' },
        { key: 'project_duration', label: 'Czas projektu', type: 'text' },
        { key: 'submission_deadline', label: 'Termin składania ofert', type: 'datetime' },
        { key: 'evaluation_deadline', label: 'Termin oceny', type: 'datetime' },
      ],
    },
    {
      title: 'Wymagania',
      fields: [
        {
          key: 'requirements',
          label: 'Wymagania (po jednym w linii)',
          type: 'string-array',
          rows: 4,
          fullWidth: true,
        },
      ],
    },
  ];

  const initialValues = {
    status: row.status,
    currency: row.currency,
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
  };

  const onSave = async (patch: Record<string, unknown>): Promise<boolean> => {
    const res = await updateTenderListingAdminAction(row.id, patch);
    if (!res.ok) {
      toast.error(res.error ?? 'Błąd zapisu');
      return false;
    }
    toast.success('Zapisano zmiany');
    return true;
  };

  const pause = async () => {
    setBusy(true);
    try {
      const res = await pauseTenderListingAction(row.id, msg);
      if (!res.ok) {
        toast.error(res.error ?? 'Błąd');
        return;
      }
      toast.success('Przetarg wstrzymany');
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
      toast.success('Przetarg aktywny');
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <ManagerMetaBlock
          managerId={row.managerId}
          managerFullName={row.managerFullName}
          managerCompanyName={row.managerCompanyName}
          count={row.bidsCount}
          countLabel="Liczba ofert"
        />
        <EditableForm sections={sections} initialValues={initialValues} onSave={onSave} busy={busy} />
      </div>
      <PauseListingSection
        kind="contest"
        paused={row.status === 'paused'}
        msg={msg}
        setMsg={setMsg}
        onPause={pause}
        onUpdateMessage={updateMessage}
        onResume={resume}
        busy={busy}
      />
    </div>
  );
}

function ManagerCell({
  managerId,
  managerFullName,
  managerCompanyName,
}: {
  managerId: string;
  managerFullName: string | null;
  managerCompanyName: string | null;
}) {
  const primary = managerCompanyName ?? managerFullName ?? '—';
  const secondary = managerCompanyName && managerFullName ? managerFullName : null;
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate font-medium">{primary}</div>
      {secondary && <div className="truncate text-xs text-muted-foreground">{secondary}</div>}
      <div className="truncate font-mono text-[10px] text-muted-foreground/70">{managerId}</div>
    </div>
  );
}

function ManagerMetaBlock({
  managerId,
  managerFullName,
  managerCompanyName,
  count,
  countLabel,
}: {
  managerId: string;
  managerFullName: string | null;
  managerCompanyName: string | null;
  count: number;
  countLabel: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Zarządca</div>
          <div className="font-mono text-xs text-muted-foreground">{managerId}</div>
          {(managerCompanyName || managerFullName) && (
            <div className="mt-1 text-sm font-medium">
              {managerCompanyName ?? managerFullName}
            </div>
          )}
          {managerCompanyName && managerFullName && (
            <div className="text-xs text-muted-foreground">{managerFullName}</div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{countLabel}</div>
          <div className="font-medium">{count}</div>
        </div>
      </div>
    </div>
  );
}

interface PauseListingSectionProps {
  kind: 'job' | 'contest';
  paused: boolean;
  msg: string;
  setMsg: (value: string) => void;
  onPause: () => void;
  onUpdateMessage: () => void;
  onResume: () => void;
  busy: boolean;
}

function PauseListingSection({
  kind,
  paused,
  msg,
  setMsg,
  onPause,
  onUpdateMessage,
  onResume,
  busy,
}: PauseListingSectionProps) {
  const titleAction = kind === 'job' ? 'Zawieś zgłoszenie' : 'Zawieś przetarg';
  const resumeAction = kind === 'job' ? 'Wznów zgłoszenie' : 'Wznów przetarg';
  const pausedLabel = kind === 'job' ? 'Zawieszone' : 'Zawieszone';
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-destructive">{titleAction}</div>
        {paused && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
            {pausedLabel}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {paused && (
          <p className="text-xs text-muted-foreground">
            {kind === 'job' ? 'Zgłoszenie' : 'Przetarg'} jest obecnie zawieszone. Wyślij zaktualizowaną wiadomość lub wznów ogłoszenie.
          </p>
        )}
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Wiadomość do zarządcy{paused ? '' : ' (wymagana)'}
        </label>
        <Textarea
          className="min-h-[120px] bg-background"
          placeholder="Co należy poprawić w ogłoszeniu…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {paused ? (
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
                {resumeAction}
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
              {titleAction}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
