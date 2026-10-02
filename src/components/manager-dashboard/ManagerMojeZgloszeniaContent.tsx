'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Loader2,
  MoreVertical,
  PanelTopOpen,
  Pencil,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { normalizeJobStatus } from '../../lib/job-workflow-status';
import {
  type ManagerSubmission,
  getSubmissionStatusLabel,
} from '../../lib/database/manager-submissions';
import { getJobWorkflowStatusSortIndex } from '../../lib/job-workflow-status';
import { canAbandonManagerContestDraft } from '../../lib/tender-workflow-status';
import { abandonContestDraftAction } from '../../app/panel-zarzadcy/konkursy/actions';
import { fetchAcceptedContractorCompanyForTender } from '../../lib/database/offer-selection';
import { createClient } from '../../lib/supabase/client';
import { useUserProfile } from '../../contexts/AuthContext';
import { CooperationReviewDialog } from '../reviews/CooperationReviewDialog';
import { ManagerSubmissionPodgladDialog } from './ManagerSubmissionPodgladDialog';
import { ManagerWorkflowAdvanceButton } from './ManagerWorkflowAdvanceButton';
import { cn } from '../ui/utils';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

function workflowShowsCompareNavigation(row: ManagerSubmission): boolean {
  if (row.hasSelectedOffer || row.offersCount === 0) return false;
  if (row.kind === 'job') {
    return normalizeJobStatus(row.status) === 'selecting_offer';
  }
  return row.status === 'evaluation';
}

interface ManagerMojeZgloszeniaContentProps {
  submissions: ManagerSubmission[];
}

type SortKey = 'title' | 'status' | 'offersCount' | 'lastOfferAt' | 'createdAt';
type SortDir = 'asc' | 'desc';

function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}): ReactElement {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className="h-3.5 w-3.5 opacity-60" />
      </button>
    </TableHead>
  );
}

export function ManagerMojeZgloszeniaContent({
  submissions: initialSubmissions,
}: ManagerMojeZgloszeniaContentProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUserProfile();
  const [submissions, setSubmissions] = useState(initialSubmissions);

  useEffect(() => {
    setSubmissions(initialSubmissions);
  }, [initialSubmissions]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [podgladRow, setPodgladRow] = useState<ManagerSubmission | null>(null);
  const [abandonDraftTarget, setAbandonDraftTarget] = useState<ManagerSubmission | null>(null);
  const [isAbandoningDraft, setIsAbandoningDraft] = useState(false);
  const [podgladInitialTab, setPodgladInitialTab] = useState<
    'details' | 'selected-offer' | 'rate-konkurs'
  >('details');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [cooperationReview, setCooperationReview] = useState<{
    tenderId: string;
    counterpartyCompanyId: string;
    counterpartyCompanyName: string;
    isEditing: boolean;
  } | null>(null);
  const [loadingCooperationReviewId, setLoadingCooperationReviewId] = useState<string | null>(null);
  const [reviewedContestIds, setReviewedContestIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const podgladId = searchParams.get('podglad');
    if (!podgladId) return;

    const typ = searchParams.get('typ');
    const kind: ManagerSubmission['kind'] =
      typ === 'przetarg' || typ === 'tender' ? 'contest' : 'job';
    const row = submissions.find((s) => s.id === podgladId && s.kind === kind);
    if (!row) return;

    const tabParam = searchParams.get('tab');
    const tab: 'details' | 'selected-offer' | 'rate-konkurs' =
      tabParam === 'selected-offer' || tabParam === 'rate-konkurs' || tabParam === 'rate-service' || tabParam === 'rate-zlecenie'
        ? tabParam === 'rate-service' || tabParam === 'rate-zlecenie'
          ? 'rate-konkurs'
          : tabParam
        : 'details';

    setPodgladRow(row);
    setPodgladInitialTab(tab);

    router.replace('/panel-zarzadcy/zgloszenia', { scroll: false });
  }, [searchParams, submissions, router]);

  const statusOptions = useMemo(() => {
    const codes = Array.from(new Set(submissions.map((r) => r.status)));
    return codes
      .map((code) => {
        const sample = submissions.find((r) => r.status === code);
        return {
          value: code,
          label: sample ? getSubmissionStatusLabel(sample.kind, code) : code,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pl'));
  }, [submissions]);

  const handleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'title' || key === 'status' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    const rows = submissions.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!row.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const mult = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return mult * a.title.localeCompare(b.title, 'pl');
        case 'status': {
          const labelA = getSubmissionStatusLabel(a.kind, a.status);
          const labelB = getSubmissionStatusLabel(b.kind, b.status);
          if (a.kind === 'job' && b.kind === 'job') {
            return (
              mult *
              (getJobWorkflowStatusSortIndex(a.status) - getJobWorkflowStatusSortIndex(b.status))
            );
          }
          return mult * labelA.localeCompare(labelB, 'pl');
        }
        case 'offersCount':
          return mult * (a.offersCount - b.offersCount);
        case 'lastOfferAt': {
          const at = a.lastOfferAt ? new Date(a.lastOfferAt).getTime() : 0;
          const bt = b.lastOfferAt ? new Date(b.lastOfferAt).getTime() : 0;
          return mult * (at - bt);
        }
        case 'createdAt':
        default:
          return mult * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
  }, [submissions, statusFilter, search, sortKey, sortDir]);

  const compareHref = (row: ManagerSubmission): string => {
    const typ = row.kind === 'contest' ? 'przetarg' : 'zgłoszenie';
    return `/panel-zarzadcy/zgloszenia/porownaj/${row.id}?typ=${typ}`;
  };

  const handleStatusUpdated = (
    rowId: string,
    kind: ManagerSubmission['kind'],
    next: string,
    patch?: Partial<ManagerSubmission>,
  ): void => {
    setSubmissions((prev) =>
      prev.map((r) =>
        r.id === rowId && r.kind === kind ? { ...r, status: next, ...patch } : r,
      ),
    );
    router.refresh();
  };

  const confirmAbandonDraft = async (): Promise<void> => {
    if (!abandonDraftTarget || abandonDraftTarget.kind !== 'contest') return;
    setIsAbandoningDraft(true);
    try {
      const result = await abandonContestDraftAction(abandonDraftTarget.id);
      if (result.success) {
        toast.success('Szkic konkursu został odrzucony');
        setSubmissions((prev) =>
          prev.filter(
            (r) => !(r.id === abandonDraftTarget.id && r.kind === abandonDraftTarget.kind),
          ),
        );
        setAbandonDraftTarget(null);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Nie udało się odrzucić szkicu konkursu');
      }
    } finally {
      setIsAbandoningDraft(false);
    }
  };

  const openSzczegoly = (
    row: ManagerSubmission,
    tab: 'details' | 'selected-offer' = row.hasSelectedOffer ? 'selected-offer' : 'details',
  ): void => {
    setPodgladInitialTab(tab);
    setPodgladRow(row);
  };

  const hasCooperationReview = (row: ManagerSubmission): boolean =>
    row.hasCooperationReview || reviewedContestIds.has(row.id);

  const markCooperationReviewSubmitted = (contestId: string): void => {
    setReviewedContestIds((prev) => new Set(prev).add(contestId));
    setSubmissions((prev) =>
      prev.map((s) => (s.id === contestId ? { ...s, hasCooperationReview: true } : s)),
    );
  };

  const handleOpenCooperationReview = async (row: ManagerSubmission): Promise<void> => {
    if (row.kind !== 'contest' || !row.hasSelectedOffer) return;

    setLoadingCooperationReviewId(row.id);
    try {
      const supabase = createClient();
      const contractor = await fetchAcceptedContractorCompanyForTender(supabase, row.id);
      if (!contractor) {
        toast.error('Nie udało się wczytać danych wykonawcy');
        return;
      }
      setCooperationReview({
        tenderId: row.id,
        counterpartyCompanyId: contractor.companyId,
        counterpartyCompanyName: contractor.companyName,
        isEditing: hasCooperationReview(row),
      });
    } finally {
      setLoadingCooperationReviewId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Zgłoszenia</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Zarządzaj statusami workflow i ofertami wykonawców.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              placeholder="Szukaj po tytule…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[260px]">
                <SelectValue placeholder="Wszystkie statusy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {statusOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {user?.actionsSuspended ? null : (
              <Button asChild className="lg:ml-auto">
                <Link href="/dodaj-konkurs">Utwórz konkurs</Link>
              </Button>
            )}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Tytuł"
                    sortKey="title"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Status"
                    sortKey="status"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Oferty"
                    sortKey="offersCount"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Ostatnia oferta"
                    sortKey="lastOfferAt"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHead
                    label="Data dodania"
                    sortKey="createdAt"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Brak pozycji spełniających kryteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const statusLabel = getSubmissionStatusLabel(row.kind, row.status);
                    const offersLabel =
                      row.newOffersCount > 0
                        ? `${row.offersCount} (${row.newOffersCount} ${row.newOffersCount === 1 ? 'nowa' : 'nowe'})`
                        : String(row.offersCount);
                    const isPickedRow = row.hasSelectedOffer;
                    const isActiveRow =
                      podgladRow?.id === row.id && podgladRow?.kind === row.kind;
                    return (
                      <TableRow
                        key={`${row.kind}-${row.id}`}
                        className={cn(
                          isPickedRow &&
                            'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10',
                          isActiveRow && !isPickedRow && 'bg-muted/50',
                        )}
                      >
                        <TableCell
                          className={cn(
                            'font-medium max-w-[240px]',
                            isPickedRow && 'text-primary',
                          )}
                        >
                          {row.title}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {statusLabel}
                        </TableCell>
                        <TableCell>{offersLabel}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {row.lastOfferAt
                            ? new Date(row.lastOfferAt).toLocaleString('pl-PL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(row.createdAt).toLocaleDateString('pl-PL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {row.canEdit ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 shrink-0"
                                asChild
                              >
                                <Link
                                  href={
                                    row.kind === 'job'
                                      ? `/panel-zarzadcy/zgloszenia/edytuj/${row.id}`
                                      : `/dodaj-konkurs/${row.id}`
                                  }
                                >
                                  <Pencil className="h-4 w-4 mr-1.5" />
                                  {row.kind === 'job' ? 'Edytuj' : 'Kontynuuj'}
                                </Link>
                              </Button>
                            ) : null}
                            <ManagerWorkflowAdvanceButton
                              row={row}
                              compact
                              onStatusUpdated={(next) =>
                                handleStatusUpdated(row.id, row.kind, next)
                              }
                            />
                            {!row.hasSelectedOffer &&
                            row.offersCount > 0 &&
                            !workflowShowsCompareNavigation(row) ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0"
                                onClick={() => router.push(compareHref(row))}
                              >
                                <BarChart3 className="h-4 w-4 mr-1.5" />
                                Porównaj
                              </Button>
                            ) : null}
                            {row.kind === 'contest' &&
                            row.hasSelectedOffer &&
                            !hasCooperationReview(row) ? (
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="h-8 shrink-0"
                                disabled={loadingCooperationReviewId === row.id}
                                onClick={() => void handleOpenCooperationReview(row)}
                              >
                                {loadingCooperationReviewId === row.id ? (
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <Star className="h-4 w-4 mr-1.5" />
                                )}
                                Oceń współpracę
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant={isPickedRow ? 'default' : 'outline'}
                              size="sm"
                              className="h-8 shrink-0"
                              onClick={() => openSzczegoly(row)}
                            >
                              <PanelTopOpen className="h-4 w-4 mr-1.5" />
                              Szczegóły
                            </Button>
                            {(() => {
                              const abandonAllowed =
                                row.kind === 'contest' &&
                                canAbandonManagerContestDraft(row.status, row.offersCount);
                              const showCooperationReviewEdit =
                                row.kind === 'contest' &&
                                row.hasSelectedOffer &&
                                hasCooperationReview(row);
                              if (!abandonAllowed && !showCooperationReviewEdit) {
                                return null;
                              }
                              return (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      aria-label="Więcej akcji"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52">
                                    {showCooperationReviewEdit ? (
                                      <DropdownMenuItem
                                        disabled={loadingCooperationReviewId === row.id}
                                        onClick={() => void handleOpenCooperationReview(row)}
                                      >
                                        <Star className="h-4 w-4 mr-2" />
                                        Ocena współpracy
                                      </DropdownMenuItem>
                                    ) : null}
                                    {abandonAllowed ? (
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => setAbandonDraftTarget(row)}
                                      >
                                        Odrzuć szkic
                                      </DropdownMenuItem>
                                    ) : null}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={abandonDraftTarget !== null}
        onOpenChange={(open) => !open && setAbandonDraftTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzucić szkic konkursu?</AlertDialogTitle>
            <AlertDialogDescription>
              Szkic „{abandonDraftTarget?.title}” zostanie trwale usunięty. Tej operacji nie można
              cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAbandoningDraft}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isAbandoningDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmAbandonDraft();
              }}
            >
              {isAbandoningDraft ? 'Usuwanie…' : 'Odrzuć szkic'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {cooperationReview ? (
        <CooperationReviewDialog
          open
          onOpenChange={(open) => !open && setCooperationReview(null)}
          variant="manager"
          tenderId={cooperationReview.tenderId}
          counterpartyCompanyId={cooperationReview.counterpartyCompanyId}
          counterpartyCompanyName={cooperationReview.counterpartyCompanyName}
          isEditing={cooperationReview.isEditing}
          onSubmitted={() => markCooperationReviewSubmitted(cooperationReview.tenderId)}
        />
      ) : null}

      <ManagerSubmissionPodgladDialog
        target={podgladRow ? { id: podgladRow.id, kind: podgladRow.kind } : null}
        open={podgladRow !== null}
        initialTab={podgladInitialTab}
        onOpenChange={(open) => {
          if (!open) {
            setPodgladRow(null);
            setPodgladInitialTab('details');
          }
        }}
        onJobStatusUpdated={(next) => {
          if (podgladRow?.kind === 'job') {
            handleStatusUpdated(podgladRow.id, 'job', next);
          }
        }}
      />
    </div>
  );
}
