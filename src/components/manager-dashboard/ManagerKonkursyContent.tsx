'use client';

import { Fragment, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  MoreVertical,
  Pencil,
  RotateCw,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type ManagerContest,
  getContestStatusLabel,
} from '../../lib/database/manager-contests';
import { groupManagerContestsByRenewal } from '../../lib/contest/manager-contest-renewal-groups';
import {
  CONTEST_STATUS_FILTER_OPTIONS,
  canAbandonManagerContestDraft,
  canCancelContest,
} from '../../lib/tender-workflow-status';
import { formatSubmissionDeadlineDisplay, formatCompareLockedTooltip } from '../../lib/contest-submission-deadline';
import {
  abandonContestDraftAction,
  cancelContestAction,
} from '../../app/panel-zarzadcy/konkursy/actions';
import { ManagerContestOffersDialog } from './ManagerContestOffersDialog';
import { ManagerContestQuestionsDialog } from './ManagerContestQuestionsDialog';
import { ManagerContestWinnerDialog } from './ManagerContestWinnerDialog';
import { CooperationReviewDialog } from '../reviews/CooperationReviewDialog';
import { ContestStatusBadge } from './ContestStatusBadge';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

interface ManagerKonkursyContentProps {
  contests: ManagerContest[];
}

type SortKey = 'title' | 'location' | 'deadline' | 'status' | 'offersCount';
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

export function ManagerKonkursyContent({
  contests: initialContests,
}: ManagerKonkursyContentProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contests, setContests] = useState(initialContests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [winnerDialogRow, setWinnerDialogRow] = useState<ManagerContest | null>(null);
  const [offersDialogRow, setOffersDialogRow] = useState<ManagerContest | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [cancelTarget, setCancelTarget] = useState<ManagerContest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [abandonDraftTarget, setAbandonDraftTarget] = useState<ManagerContest | null>(null);
  const [isAbandoningDraft, setIsAbandoningDraft] = useState(false);
  const [questionsDialog, setQuestionsDialog] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [cooperationReviewTarget, setCooperationReviewTarget] = useState<ManagerContest | null>(
    null,
  );
  const [repeatContestTarget, setRepeatContestTarget] = useState<ManagerContest | null>(null);
  const [reviewedContestIds, setReviewedContestIds] = useState<Set<string>>(() => new Set());
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialContests.map((c) => [c.id, c.unseenQuestionsCount])),
  );
  const [unansweredCounts, setUnansweredCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialContests.map((c) => [c.id, c.unansweredQuestionsCount])),
  );

  useEffect(() => {
    setContests(initialContests);
    setUnseenCounts(
      Object.fromEntries(initialContests.map((c) => [c.id, c.unseenQuestionsCount])),
    );
    setUnansweredCounts(
      Object.fromEntries(initialContests.map((c) => [c.id, c.unansweredQuestionsCount])),
    );
  }, [initialContests]);

  useEffect(() => {
    const registrationMessage = searchParams.get('message');
    if (registrationMessage) {
      toast.success(registrationMessage);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('message');
      const query = params.toString();
      router.replace(query ? `/panel-zarzadcy/konkursy?${query}` : '/panel-zarzadcy/konkursy', {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const openId = searchParams.get('contestId') ?? searchParams.get('podglad');
    if (!openId) return;

    const row = contests.find((c) => c.id === openId);
    if (!row) return;

    const tabParam = searchParams.get('tab');

    if (tabParam === 'questions') {
      setQuestionsDialog({ id: row.id, title: row.title });
      setUnseenCounts((prev) => ({ ...prev, [row.id]: 0 }));
    } else if (tabParam === 'selected-offer' && row.hasSelectedOffer) {
      setWinnerDialogRow(row);
    } else if (tabParam === 'offers') {
      setOffersDialogRow(row);
    }

    router.replace('/panel-zarzadcy/konkursy', { scroll: false });
  }, [searchParams, contests, router]);

  const openQuestionsDialog = (row: ManagerContest): void => {
    setQuestionsDialog({ id: row.id, title: row.title });
  };

  const handleUnseenCountChange = (contestId: string, count: number): void => {
    setUnseenCounts((prev) => ({ ...prev, [contestId]: count }));
  };

  const handleUnansweredCountChange = (contestId: string, count: number): void => {
    setUnansweredCounts((prev) => ({ ...prev, [contestId]: count }));
  };

  const handleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'title' || key === 'location' || key === 'status' ? 'asc' : 'desc');
    }
  };

  const filteredGroups = useMemo(() => {
    const groups = groupManagerContestsByRenewal(contests).filter(({ head }) => {
      if (statusFilter !== 'all' && head.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !head.title.toLowerCase().includes(q) &&
          !head.locationLabel.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    const mult = sortDir === 'asc' ? 1 : -1;
    return [...groups].sort((a, b) => {
      const left = a.head;
      const right = b.head;
      switch (sortKey) {
        case 'title':
          return mult * left.title.localeCompare(right.title, 'pl');
        case 'location':
          return mult * left.locationLabel.localeCompare(right.locationLabel, 'pl');
        case 'deadline':
          return (
            mult *
            (new Date(left.submissionDeadline).getTime() -
              new Date(right.submissionDeadline).getTime())
          );
        case 'status':
          return mult * getContestStatusLabel(left.status).localeCompare(
            getContestStatusLabel(right.status),
            'pl',
          );
        case 'offersCount':
          return mult * (left.offersCount - right.offersCount);
        default:
          return 0;
      }
    });
  }, [contests, statusFilter, search, sortKey, sortDir]);

  const compareHref = (id: string): string =>
    `/panel-zarzadcy/konkursy/porownaj/${id}`;

  const handleContestUpdated = (id: string, patch: Partial<ManagerContest>): void => {
    setContests((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    router.refresh();
  };

  const confirmAbandonDraft = async (): Promise<void> => {
    if (!abandonDraftTarget) return;
    setIsAbandoningDraft(true);
    try {
      const result = await abandonContestDraftAction(abandonDraftTarget.id);
      if (result.success) {
        toast.success('Szkic konkursu został odrzucony');
        setContests((prev) => prev.filter((c) => c.id !== abandonDraftTarget.id));
        setAbandonDraftTarget(null);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Nie udało się odrzucić szkicu konkursu');
      }
    } finally {
      setIsAbandoningDraft(false);
    }
  };

  const confirmCancel = async (): Promise<void> => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const result = await cancelContestAction(cancelTarget.id);
      if (result.success) {
        toast.success('Konkurs został unieważniony');
        handleContestUpdated(cancelTarget.id, { status: 'cancelled' });
        setCancelTarget(null);
      } else {
        toast.error(result.error ?? 'Nie udało się unieważnić konkursu');
      }
    } finally {
      setCancelling(false);
    }
  };

  const renderDraftContinueButton = (row: ManagerContest): ReactElement | null => {
    if (row.status !== 'draft') return null;

    return (
      <Button variant="default" size="sm" className="h-8 shrink-0" asChild>
        <Link href={`/dodaj-konkurs/${row.id}`}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Kontynuuj
        </Link>
      </Button>
    );
  };

  const renderStatusCell = (row: ManagerContest): ReactElement => {
    const badge = <ContestStatusBadge status={row.status} />;

    if (row.status === 'active') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default">{badge}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {formatCompareLockedTooltip(row.submissionDeadline)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return badge;
  };

  const hasCooperationReview = (row: ManagerContest): boolean =>
    row.hasCooperationReview || reviewedContestIds.has(row.id);

  const markCooperationReviewSubmitted = (contestId: string): void => {
    setReviewedContestIds((prev) => new Set(prev).add(contestId));
    setContests((prev) =>
      prev.map((c) => (c.id === contestId ? { ...c, hasCooperationReview: true } : c)),
    );
  };

  const renderCooperationReviewButton = (row: ManagerContest): ReactElement | null => {
    if (
      !row.hasSelectedOffer ||
      !row.selectedContractorCompanyId ||
      !row.selectedContractorName ||
      hasCooperationReview(row)
    ) {
      return null;
    }

    return (
      <Button
        variant="default"
        size="sm"
        className="h-8 shrink-0"
        onClick={() => setCooperationReviewTarget(row)}
      >
        <Star className="h-4 w-4 mr-1.5" />
        Oceń współpracę
      </Button>
    );
  };

  const renderPrimaryEvaluationAction = (row: ManagerContest): ReactElement | null => {
    if (row.status !== 'evaluation' || row.offersCount === 0) {
      return null;
    }

    return (
      <Button
        variant="default"
        size="sm"
        className="h-8 shrink-0"
        onClick={() => router.push(compareHref(row.id))}
      >
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Porównaj oferty
      </Button>
    );
  };

  const renderRepeatContestButton = (row: ManagerContest): ReactElement | null => {
    if (row.status !== 'no_offers') {
      return null;
    }

    return (
      <Button
        variant="default"
        size="sm"
        className="h-8 shrink-0"
        onClick={() => setRepeatContestTarget(row)}
      >
        <RotateCw className="h-4 w-4 mr-1.5" />
        Ponów
      </Button>
    );
  };

  const renderContestDataCells = (
    row: ManagerContest,
    options?: { compact?: boolean },
  ): ReactElement => {
    const deadlineDisplay = formatSubmissionDeadlineDisplay(row.submissionDeadline);
    const isPickedRow = row.hasSelectedOffer;
    const compact = options?.compact ?? false;

    return (
      <>
        <TableCell
          className={cn(
            'max-w-0 truncate',
            isPickedRow && 'text-primary',
            compact && 'text-sm',
          )}
        >
          <Link
            href={`/konkurs/${row.id}`}
            target="_blank"
            rel="noopener noreferrer"
            title={row.title}
            className={cn(
              'font-medium truncate leading-snug hover:underline block',
              isPickedRow
                ? 'text-primary hover:text-primary/80'
                : 'text-foreground hover:text-primary',
            )}
          >
            {row.title}
          </Link>
        </TableCell>
        <TableCell
          className={cn(
            'text-sm text-muted-foreground max-w-0 truncate',
            compact && 'text-xs',
          )}
          title={row.locationLabel}
        >
          {row.locationLabel}
        </TableCell>
        <TableCell className={cn('text-sm whitespace-nowrap', compact && 'text-xs')}>
          {deadlineDisplay ? (
            <span>
              <span className="font-medium">{deadlineDisplay.formatted}</span>
              {deadlineDisplay.hint ? (
                <span className="text-muted-foreground block text-xs">
                  ({deadlineDisplay.hint})
                </span>
              ) : null}
            </span>
          ) : (
            '—'
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">{renderStatusCell(row)}</TableCell>
        <TableCell className="whitespace-nowrap">
          <span className="tabular-nums">{row.offersCount}</span>
        </TableCell>
        <TableCell className="text-right whitespace-nowrap">
          {!compact ? (
            <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
              {renderDraftContinueButton(row)}
              {renderPrimaryEvaluationAction(row)}
              {renderCooperationReviewButton(row)}
              {renderRepeatContestButton(row)}
              {renderActionsMenu(row)}
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
              <Link href={`/konkurs/${row.id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-1.5" />
                Podgląd
              </Link>
            </Button>
          )}
        </TableCell>
      </>
    );
  };

  const renderActionsMenu = (row: ManagerContest): ReactElement | null => {
    const showQuestions = (row.questionsCount ?? 0) > 0;
    const unseen = unseenCounts[row.id] ?? 0;
    const pendingCount = unansweredCounts[row.id] ?? 0;

    const abandonDraftAllowed = canAbandonManagerContestDraft(row.status, row.offersCount);
    const showViewResults = row.status === 'awarded' && row.offersCount > 0;
    const showCooperationReviewEdit =
      row.hasSelectedOffer &&
      Boolean(row.selectedContractorCompanyId) &&
      Boolean(row.selectedContractorName) &&
      hasCooperationReview(row);
    const hasMenuItems =
      showViewResults ||
      abandonDraftAllowed ||
      canCancelContest(row.status) ||
      showQuestions ||
      showCooperationReviewEdit;

    if (!hasMenuItems) {
      return null;
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative h-8 w-8 shrink-0"
            aria-label="Więcej akcji"
          >
            <MoreVertical className="h-4 w-4" />
            {unseen > 0 ? (
              <span className="absolute top-0.5 right-0.5 flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {showViewResults ? (
            <DropdownMenuItem onClick={() => router.push(compareHref(row.id))}>
              <Eye className="h-4 w-4 mr-2" />
              Zobacz wyniki
            </DropdownMenuItem>
          ) : null}
          {abandonDraftAllowed ? (
            <>
              {showViewResults ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setAbandonDraftTarget(row)}
              >
                Odrzuć szkic
              </DropdownMenuItem>
            </>
          ) : null}
          {showQuestions ? (
            <>
              {showViewResults || abandonDraftAllowed ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => openQuestionsDialog(row)}>
                Pytania do konkursu
                {pendingCount > 0 ? ` (${pendingCount})` : ''}
              </DropdownMenuItem>
            </>
          ) : null}
          {canCancelContest(row.status) ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setCancelTarget(row)}
              >
                Unieważnij
              </DropdownMenuItem>
            </>
          ) : null}
          {showCooperationReviewEdit ? (
            <>
              {showViewResults ||
              abandonDraftAllowed ||
              showQuestions ||
              canCancelContest(row.status) ? (
                <DropdownMenuSeparator />
              ) : null}
              <DropdownMenuItem onClick={() => setCooperationReviewTarget(row)}>
                <Star className="h-4 w-4 mr-2" />
                Ocena współpracy
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Konkursy</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Zarządzaj wyborem wykonawców i ofert w ramach konkursu.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              placeholder="Szukaj po tytule lub lokalizacji…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[280px]">
                <SelectValue placeholder="Wszystkie statusy" />
              </SelectTrigger>
              <SelectContent>
                {CONTEST_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table className="table-fixed w-full min-w-[960px]">
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Tytuł konkursu"
                    sortKey="title"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-[22%]"
                  />
                  <SortableHead
                    label="Lokalizacja"
                    sortKey="location"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-[14%]"
                  />
                  <SortableHead
                    label="Termin składania"
                    sortKey="deadline"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-[13%]"
                  />
                  <SortableHead
                    label="Status konkursu"
                    sortKey="status"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-[18%] min-w-[168px]"
                  />
                  <SortableHead
                    label="Złożone oferty"
                    sortKey="offersCount"
                    activeKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                    className="w-[9%] min-w-[88px] whitespace-nowrap"
                  />
                  <TableHead className="text-right w-[24%] min-w-[220px] whitespace-nowrap">
                    Akcje
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Brak konkursów spełniających kryteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map(({ head, predecessors }) => {
                    const isPickedRow = head.hasSelectedOffer;

                    return (
                      <Fragment key={head.id}>
                        <TableRow
                          className={cn(
                            isPickedRow &&
                              'bg-primary/5 border-l-4 border-l-primary hover:bg-primary/10',
                          )}
                        >
                          {renderContestDataCells(head)}
                        </TableRow>
                        {predecessors.length > 0 ? (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={6} className="py-0 px-4">
                              <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="history" className="border-0">
                                  <AccordionTrigger className="py-3 text-sm text-muted-foreground hover:no-underline">
                                    Poprzednie edycje konkursu ({predecessors.length})
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-4">
                                    <div className="rounded-md border overflow-x-auto bg-background">
                                      <Table className="table-fixed w-full min-w-[880px]">
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="w-[22%]">Tytuł konkursu</TableHead>
                                            <TableHead className="w-[14%]">Lokalizacja</TableHead>
                                            <TableHead className="w-[13%]">Termin składania</TableHead>
                                            <TableHead className="w-[18%]">Status konkursu</TableHead>
                                            <TableHead className="w-[9%]">Złożone oferty</TableHead>
                                            <TableHead className="text-right w-[24%]">Akcje</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {predecessors.map((row) => (
                                            <TableRow key={row.id} className="text-muted-foreground">
                                              {renderContestDataCells(row, { compact: true })}
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ManagerContestQuestionsDialog
        contestId={questionsDialog?.id ?? null}
        contestTitle={questionsDialog?.title ?? ''}
        open={questionsDialog !== null}
        onOpenChange={(open) => {
          if (!open) setQuestionsDialog(null);
        }}
        onUnseenCountChange={handleUnseenCountChange}
        onUnansweredCountChange={handleUnansweredCountChange}
      />

      {cooperationReviewTarget?.selectedContractorCompanyId &&
      cooperationReviewTarget.selectedContractorName ? (
        <CooperationReviewDialog
          open
          onOpenChange={(open) => !open && setCooperationReviewTarget(null)}
          variant="manager"
          tenderId={cooperationReviewTarget.id}
          counterpartyCompanyId={cooperationReviewTarget.selectedContractorCompanyId}
          counterpartyCompanyName={cooperationReviewTarget.selectedContractorName}
          isEditing={hasCooperationReview(cooperationReviewTarget)}
          onSubmitted={() => markCooperationReviewSubmitted(cooperationReviewTarget.id)}
        />
      ) : null}

      <ManagerContestWinnerDialog
        contestId={winnerDialogRow?.id ?? null}
        contestTitle={winnerDialogRow?.title}
        open={winnerDialogRow !== null}
        onOpenChange={(open) => {
          if (!open) setWinnerDialogRow(null);
        }}
      />

      <ManagerContestOffersDialog
        contestId={offersDialogRow?.id ?? null}
        contestTitle={offersDialogRow?.title}
        open={offersDialogRow !== null}
        onOpenChange={(open) => {
          if (!open) setOffersDialogRow(null);
        }}
      />

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

      <AlertDialog open={cancelTarget !== null} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unieważnić konkurs?</AlertDialogTitle>
            <AlertDialogDescription>
              Konkurs „{cancelTarget?.title}” zostanie oznaczony jako unieważniony. Wykonawcy nie
              będą mogli składać nowych ofert. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmCancel();
              }}
            >
              {cancelling ? 'Unieważnianie…' : 'Unieważnij konkurs'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={repeatContestTarget !== null}
        onOpenChange={(open) => !open && setRepeatContestTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ponowić konkurs?</AlertDialogTitle>
            <AlertDialogDescription>
              Możesz ponownie otworzyć konkurs na podstawie danych z „
              {repeatContestTarget?.title}”. Formularz zostanie wstępnie wypełniony danymi z tego
              konkursu — musisz podać nowe terminy (daty składania ofert, pytań i rozstrzygnięcia).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!repeatContestTarget) return;
                router.push(`/dodaj-konkurs?duplicateFrom=${repeatContestTarget.id}`);
                setRepeatContestTarget(null);
              }}
            >
              Kontynuuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
