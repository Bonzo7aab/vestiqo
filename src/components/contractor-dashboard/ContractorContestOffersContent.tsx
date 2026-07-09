'use client';

import { useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FilePen, Loader2, MessagesSquare, MoreVertical, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
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
import { createClient } from '../../lib/supabase/client';
import type { ContractorContestOfferRow } from '../../lib/database/contractor-contest-offers';
import {
  canAbandonContestOfferDraft,
  canMessageManagerOnContestOffer,
  canRateCooperationOnContestOffer,
  canWithdrawContestOffer,
} from '../../lib/contest-offer/contractor-contest-offer-status';
import { CONTEST_STATUS_FILTER_OPTIONS } from '../../lib/tender-workflow-status';
import { abandonTenderBidDraftAction } from '../../lib/database/contest-offers-actions';
import { getTenderById } from '../../lib/data';
import {
  isContestTender,
  mapTenderRowToContestDisplay,
} from '../../lib/contest/map-tender-contest-display';
import { ContestOfferSubmissionDialog } from '../contest-offer/ContestOfferSubmissionDialog';
import { useUserProfile } from '../../contexts/AuthContext';
import type { ContestInfo } from '../../types/job';
import { formatSubmissionDeadlineDisplay } from '../../lib/contest-submission-deadline';
import { ContractorContestOfferStatusBadge } from './ContractorContestOfferStatusBadge';
import type { TenderWithCompany } from '../../lib/database/jobs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { CooperationReviewDialog } from '../reviews/CooperationReviewDialog';
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

interface ContractorContestOffersContentProps {
  offers: ContractorContestOfferRow[];
  companyId: string;
}

interface ContinueDraftDialogContext {
  tenderId: string;
  jobTitle: string;
  description: string;
  category?: string;
  subcategory?: string;
  contestInfo: ContestInfo;
}

function formatMoneyPl(price: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function ContractorContestOffersContent({
  offers,
  companyId,
}: ContractorContestOffersContentProps) {
  const router = useRouter();
  const { user } = useUserProfile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [abandonTarget, setAbandonTarget] = useState<ContractorContestOfferRow | null>(null);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<ContractorContestOfferRow | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [continueDraftDialog, setContinueDraftDialog] =
    useState<ContinueDraftDialogContext | null>(null);
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  const [cooperationReviewTarget, setCooperationReviewTarget] =
    useState<ContractorContestOfferRow | null>(null);
  const [reviewedTenderIds, setReviewedTenderIds] = useState<Set<string>>(() => new Set());

  const filteredOffers = useMemo(() => {
    return offers.filter((row) => {
      if (statusFilter !== 'all' && row.tenderStatus !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !row.contestTitle.toLowerCase().includes(q) &&
          !row.organizerName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [offers, statusFilter, search]);

  const handleWithdraw = async (): Promise<void> => {
    if (!withdrawTarget) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !companyId) {
      toast.error('Musisz być zalogowany aby wycofać ofertę');
      return;
    }

    setIsWithdrawing(true);
    try {
      const { cancelTenderBid } = await import('../../lib/database/jobs');
      const result = await cancelTenderBid(supabase, withdrawTarget.id, user.id);

      if (result.error) {
        const err = result.error;
        const errorMessage =
          err instanceof Error ? err.message : 'Wystąpił błąd podczas wycofywania oferty';
        toast.error(errorMessage);
        return;
      }

      toast.success('Oferta została wycofana');
      setWithdrawTarget(null);
      router.refresh();
    } catch (error) {
      console.error('Error withdrawing contest offer:', error);
      toast.error('Wystąpił błąd podczas wycofywania oferty');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleContinueDraft = async (row: ContractorContestOfferRow): Promise<void> => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany aby kontynuować szkic');
      return;
    }

    setLoadingDraftId(row.id);
    try {
      const { data: dbTender, error } = await getTenderById(row.tenderId);

      if (error || !dbTender || !isContestTender(dbTender)) {
        toast.error('Nie można otworzyć szkicu oferty');
        return;
      }

      const contestInfo = mapTenderRowToContestDisplay(dbTender);

      setContinueDraftDialog({
        tenderId: row.tenderId,
        jobTitle: dbTender.title ?? row.contestTitle,
        description: dbTender.description ?? '',
        category: dbTender.category?.name,
        subcategory: dbTender.subcategory?.name,
        contestInfo,
      });
    } catch (error) {
      console.error('Error opening draft:', error);
      toast.error('Wystąpił błąd podczas otwierania szkicu');
    } finally {
      setLoadingDraftId(null);
    }
  };

  const handleMessage = async (row: ContractorContestOfferRow) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Musisz być zalogowany aby rozpocząć konwersację');
      return;
    }

    try {
      const { getTenderById } = await import('../../lib/data');
      const { data: dbTender, error: tenderError } = await getTenderById(row.tenderId);

      if (tenderError || !dbTender) {
        toast.error('Nie można znaleźć konkursu');
        return;
      }

      const managerId =
        (dbTender as TenderWithCompany & { manager_id?: string }).manager_id || null;

      if (!managerId) {
        toast.error('Nie można znaleźć zarządcy');
        return;
      }

      const { findConversationByJob } = await import('../../lib/database/messaging');
      const result = await findConversationByJob(
        supabase,
        row.tenderId,
        user.id,
        managerId,
        true,
      );

      if (result.error) {
        router.push(`/wiadomosci?recipient=${managerId}&jobId=${row.tenderId}`);
        return;
      }

      if (result.data) {
        router.push(`/wiadomosci?conversation=${result.data}`);
      } else {
        router.push(`/wiadomosci?recipient=${managerId}&jobId=${row.tenderId}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Wystąpił błąd podczas otwierania wiadomości');
    }
  };

  const handleAbandonDraft = async (): Promise<void> => {
    if (!abandonTarget) return;

    setIsAbandoning(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Musisz być zalogowany');
        return;
      }

      const result = await abandonTenderBidDraftAction({
        contractorId: user.id,
        bidId: abandonTarget.id,
        tenderId: abandonTarget.tenderId,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Nie udało się odrzucić szkicu oferty');
        return;
      }

      toast.success('Szkic oferty został odrzucony');
      setAbandonTarget(null);
      router.refresh();
    } finally {
      setIsAbandoning(false);
    }
  };

  const hasCooperationReview = (row: ContractorContestOfferRow): boolean =>
    row.hasCooperationReview || reviewedTenderIds.has(row.tenderId);

  const renderActionsMenu = (
    row: ContractorContestOfferRow,
    messageAllowed: boolean,
    withdrawAllowed: boolean,
    abandonAllowed: boolean,
    cooperationReviewMenuAllowed: boolean,
  ): ReactElement | null => {
    if (!messageAllowed && !withdrawAllowed && !abandonAllowed && !cooperationReviewMenuAllowed) {
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
          {abandonAllowed ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setAbandonTarget(row)}
            >
              Odrzuć szkic
            </DropdownMenuItem>
          ) : null}
          {messageAllowed ? (
            <>
              {abandonAllowed ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => void handleMessage(row)}>
                <MessagesSquare className="h-4 w-4 mr-2" />
                Wiadomość do organizatora
              </DropdownMenuItem>
            </>
          ) : null}
          {withdrawAllowed ? (
            <>
              {messageAllowed || abandonAllowed ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setWithdrawTarget(row)}
              >
                Wycofaj ofertę
              </DropdownMenuItem>
            </>
          ) : null}
          {cooperationReviewMenuAllowed ? (
            <>
              {messageAllowed || abandonAllowed || withdrawAllowed ? (
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
        <h1 className="text-2xl font-bold tracking-tight">Moje oferty</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Przeglądaj szkice i złożone oferty w konkursach organizatorów.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              placeholder="Szukaj po nazwie konkursu lub organizatorze…"
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

          {filteredOffers.length === 0 ? (
            <div className="rounded-md border p-6 text-center">
              <h3 className="text-base font-medium text-muted-foreground mb-2">
                Brak ofert w tej kategorii
              </h3>
              <p className="text-sm text-muted-foreground">
                {offers.length === 0
                  ? 'Nie masz jeszcze ofert w konkursach. Przeglądaj konkursy i składaj oferty — zapisane szkice też pojawią się tutaj.'
                  : 'Zmień filtr lub wyszukiwanie, aby zobaczyć inne oferty.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa konkursu i Organizator</TableHead>
                  <TableHead>Twoja wycena (Netto / Brutto)</TableHead>
                  <TableHead>Termin składania</TableHead>
                  <TableHead>Status oferty</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((row) => {
                  const deadlineDisplay = formatSubmissionDeadlineDisplay(
                    row.submissionDeadline,
                  );
                  const withdrawAllowed = canWithdrawContestOffer({
                    bidStatus: row.bidStatus,
                    tenderStatus: row.tenderStatus,
                    submissionDeadlineIso: row.submissionDeadline,
                  });
                  const messageAllowed = canMessageManagerOnContestOffer(row.derivedStatus);
                  const cooperationReviewAllowed = canRateCooperationOnContestOffer(row.derivedStatus);
                  const hasReview = hasCooperationReview(row);
                  const abandonAllowed = canAbandonContestOfferDraft(row.bidStatus);
                  const isDraft = row.derivedStatus === 'draft';
                  const hasPricing = row.netPrice > 0;

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[300px]">
                        <div className="min-w-0">
                          <Link
                            href={`/konkurs/${row.tenderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium truncate leading-snug hover:underline block max-w-full text-foreground hover:text-primary"
                          >
                            {row.contestTitle}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            {row.organizerName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasPricing ? (
                          <>
                            <p className="font-medium">{formatMoneyPl(row.netPrice)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatMoneyPl(row.grossPrice)}{' '}
                              <span className="text-xs">({row.vatLabel})</span>
                            </p>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {isDraft ? 'Uzupełnij w szkicu' : '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {deadlineDisplay ? (
                          <>
                            <p className="font-medium">{deadlineDisplay.formatted}</p>
                            {deadlineDisplay.hint ? (
                              <p className="text-xs text-muted-foreground">
                                ({deadlineDisplay.hint})
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ContractorContestOfferStatusBadge status={row.derivedStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isDraft ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 shrink-0"
                              disabled={loadingDraftId === row.id}
                              onClick={() => void handleContinueDraft(row)}
                            >
                              {loadingDraftId === row.id ? (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                              ) : (
                                <FilePen className="h-4 w-4 mr-1.5" />
                              )}
                              Szkic
                            </Button>
                          ) : null}
                          {cooperationReviewAllowed && !hasReview ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 shrink-0"
                              onClick={() => setCooperationReviewTarget(row)}
                            >
                              <Star className="h-4 w-4 mr-1.5" />
                              Oceń współpracę
                            </Button>
                          ) : null}
                          {renderActionsMenu(
                            row,
                            messageAllowed,
                            withdrawAllowed,
                            abandonAllowed,
                            cooperationReviewAllowed && hasReview,
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={abandonTarget !== null} onOpenChange={(open) => !open && setAbandonTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzucić szkic oferty?</AlertDialogTitle>
            <AlertDialogDescription>
              Szkic dla „{abandonTarget?.contestTitle}” zostanie trwale usunięty. Tej operacji
              nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAbandoning}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isAbandoning}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleAbandonDraft();
              }}
            >
              {isAbandoning ? 'Usuwanie…' : 'Odrzuć szkic'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={withdrawTarget !== null}
        onOpenChange={(open) => !open && !isWithdrawing && setWithdrawTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wycofać ofertę?</AlertDialogTitle>
            <AlertDialogDescription>
              Oferta w konkursie „{withdrawTarget?.contestTitle}” zostanie wycofana. Nie będziesz
              brać udziału w tym postępowaniu — tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWithdrawing}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={isWithdrawing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleWithdraw();
              }}
            >
              {isWithdrawing ? 'Wycofywanie…' : 'Wycofaj ofertę'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {cooperationReviewTarget ? (
        <CooperationReviewDialog
          open
          onOpenChange={(open) => !open && setCooperationReviewTarget(null)}
          variant="contractor"
          tenderId={cooperationReviewTarget.tenderId}
          counterpartyCompanyId={cooperationReviewTarget.organizerCompanyId}
          counterpartyCompanyName={cooperationReviewTarget.organizerName}
          isEditing={hasCooperationReview(cooperationReviewTarget)}
          onSubmitted={() => {
            setReviewedTenderIds((prev) => new Set(prev).add(cooperationReviewTarget.tenderId));
          }}
        />
      ) : null}

      {continueDraftDialog && user?.id ? (
        <ContestOfferSubmissionDialog
          isOpen
          onClose={() => setContinueDraftDialog(null)}
          tenderId={continueDraftDialog.tenderId}
          jobTitle={continueDraftDialog.jobTitle}
          description={continueDraftDialog.description}
          category={continueDraftDialog.category}
          subcategory={continueDraftDialog.subcategory}
          contestInfo={continueDraftDialog.contestInfo}
          contractorId={user.id}
          onSubmitted={() => {
            setContinueDraftDialog(null);
            router.refresh();
          }}
          onDraftSaved={() => {
            router.refresh();
          }}
          onDraftAbandoned={() => {
            setContinueDraftDialog(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
