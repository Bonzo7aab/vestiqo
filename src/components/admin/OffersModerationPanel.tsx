'use client';

import React, { useState } from 'react';
import { Briefcase, ChevronDown, ChevronRight, Gavel } from 'lucide-react';
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
  suspendJobApplicationAction,
  suspendTenderBidAction,
  unsuspendJobApplicationAction,
  unsuspendTenderBidAction,
  updateJobApplicationAdminAction,
  updateTenderBidAdminAction,
} from '../../app/administracja/actions';
import type { AdminJobApplicationRow, AdminTenderBidRow } from '../../lib/database/admin-offers';
import { offerEffectiveStatus, statusBadgeClass } from '../../lib/admin/status-labels';
import { SortableHeader, type SortState } from './SortableHeader';
import { EditableForm, type FormSection } from './EditableForm';
import { AdminEmptyState } from './AdminEmptyState';
import { AdminFilterChip } from './AdminFilterChip';
import { AdminPanelCard } from './AdminPanelCard';

interface OffersModerationPanelProps {
  applications: AdminJobApplicationRow[];
  bids: AdminTenderBidRow[];
}

type OfferSortKey = 'status' | 'submittedAt' | 'updatedAt';

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

function compareString(a: string | null | undefined, b: string | null | undefined): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function applySort<TRow>(
  rows: TRow[],
  sort: SortState<OfferSortKey> | null,
  effectiveStatusLabel: (row: TRow) => string,
  submittedAt: (row: TRow) => string | null,
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
      case 'submittedAt':
        cmp = compareString(submittedAt(a), submittedAt(b));
        break;
      case 'updatedAt':
        cmp = compareString(updatedAt(a), updatedAt(b));
        break;
    }
    return cmp * dir;
  });
  return sorted;
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
        <div className="overflow-x-auto">
          {view === 'job' ? (
            <JobApplicationsTable rows={applications} />
          ) : (
            <TenderBidsTable rows={bids} />
          )}
        </div>
      </AdminPanelCard>
    </div>
  );
}

function JobApplicationsTable({ rows }: { rows: AdminJobApplicationRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<SortState<OfferSortKey> | null>({ key: 'submittedAt', direction: 'desc' });

  const sorted = React.useMemo(
    () =>
      applySort(
        rows,
        sort,
        (r) => offerEffectiveStatus(r.status, r.adminModerationStatus).label,
        (r) => r.submittedAt,
        (r) => r.updatedAt
      ),
    [rows, sort]
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak ofert na zgłoszenia do moderacji." />;
  }

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Zgłoszenie</TableHead>
            <TableHead>Wykonawca</TableHead>
            <TableHead>
              <SortableHeader<OfferSortKey> label="Status" sortKey="status" sort={sort} onSortChange={setSort} />
            </TableHead>
            <TableHead>Kwota</TableHead>
            <TableHead>
              <SortableHeader<OfferSortKey>
                label="Złożono"
                sortKey="submittedAt"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader<OfferSortKey>
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
                  <TableCell className="max-w-[260px] truncate font-medium">
                    {row.jobTitle ?? row.jobId}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.companyName ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge baseStatus={row.status} adminModerationStatus={row.adminModerationStatus} />
                  </TableCell>
                  <TableCell>
                    {row.proposedPrice != null ? `${row.proposedPrice} ${row.currency ?? 'PLN'}` : '—'}
                  </TableCell>
                  <TableCell>{formatDate(row.submittedAt)}</TableCell>
                  <TableCell>{formatDate(row.updatedAt)}</TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell />
                    <TableCell colSpan={6} className="whitespace-normal py-4 align-top">
                      <JobApplicationDetails row={row} />
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
  const [sort, setSort] = React.useState<SortState<OfferSortKey> | null>({ key: 'submittedAt', direction: 'desc' });

  const sorted = React.useMemo(
    () =>
      applySort(
        rows,
        sort,
        (r) => offerEffectiveStatus(r.status, r.adminModerationStatus).label,
        (r) => r.submittedAt,
        (r) => r.updatedAt
      ),
    [rows, sort]
  );

  if (rows.length === 0) {
    return <AdminEmptyState message="Brak ofert przetargowych do moderacji." />;
  }

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Przetarg</TableHead>
            <TableHead>Wykonawca</TableHead>
            <TableHead>
              <SortableHeader<OfferSortKey> label="Status" sortKey="status" sort={sort} onSortChange={setSort} />
            </TableHead>
            <TableHead>Kwota</TableHead>
            <TableHead>
              <SortableHeader<OfferSortKey>
                label="Złożono"
                sortKey="submittedAt"
                sort={sort}
                onSortChange={setSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader<OfferSortKey>
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
                  <TableCell className="max-w-[260px] truncate font-medium">
                    {row.tenderTitle ?? row.tenderId}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.companyName ?? '—'}</TableCell>
                  <TableCell>
                    <StatusBadge baseStatus={row.status} adminModerationStatus={row.adminModerationStatus} />
                  </TableCell>
                  <TableCell>
                    {row.bidAmount != null ? `${row.bidAmount} ${row.currency ?? 'PLN'}` : '—'}
                  </TableCell>
                  <TableCell>{formatDate(row.submittedAt)}</TableCell>
                  <TableCell>{formatDate(row.updatedAt)}</TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell />
                    <TableCell colSpan={6} className="whitespace-normal py-4 align-top">
                      <TenderBidDetails row={row} />
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
