'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, MessageCircleQuestion, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { TabsContent } from '../ui/tabs';
import { useUserProfile } from '../../contexts/AuthContext';
import {
  fetchContestQuestionsForContractor,
  fetchOwnPendingContestQuestions,
  formatPostgrestError,
  submitQuestion,
  type ContestQuestionPublished,
  type ContestQuestionPending,
} from '../../lib/database/questions';
import {
  formatContractorQuestionLabel,
  isContestQuestionsDeadlinePassed,
} from '../../lib/contest-questions/format-contest-question-label';
import { ContestQuestionCommentsList } from '../contest-questions/ContestQuestionCommentsList';
import { ManagerContestQuestionsPanel } from '../manager-dashboard/ManagerContestQuestionsPanel';
import { notifyManagerContestQuestionAction } from '../../app/pytania-konkursu/actions';
import {
  ContestDetailEmptyState,
  ContestDetailProse,
  ContestDetailSection,
  ContestDetailTabPanel,
} from './ContestDetailTabLayout';
import { cn } from '../ui/utils';

interface ContestQuestionsTabProps {
  tenderId: string;
  allowQuestions: boolean;
  submissionDeadline: string;
  contestStatus?: string;
  isContestOwner?: boolean;
  isManager?: boolean;
  onQuestionsCountChange?: (count: number) => void;
}

function ContestQuestionsManagerTab({
  tenderId,
  onQuestionsCountChange,
}: {
  tenderId: string;
  onQuestionsCountChange?: (count: number) => void;
}): React.ReactElement {
  return (
    <TabsContent value="contest-qa" className="mt-0 focus-visible:outline-none">
      <ContestDetailTabPanel>
        <ContestDetailSection
          icon={HelpCircle}
          title="Pytania i odpowiedzi"
          description="Odpowiadaj na pytania wykonawców — odpowiedzi są widoczne publicznie."
        >
          <ManagerContestQuestionsPanel
            contestId={tenderId}
            onQuestionsChange={onQuestionsCountChange}
          />
        </ContestDetailSection>
      </ContestDetailTabPanel>
    </TabsContent>
  );
}

function PendingQuestionCard({ question }: { question: string }): React.ReactElement {
  return (
    <article className="rounded-lg border border-dashed border-amber-300/70 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        Oczekuje na odpowiedź organizatora
      </p>
      <ContestDetailProse className="text-foreground">{question}</ContestDetailProse>
    </article>
  );
}

function PublishedQuestionCard({
  item,
}: {
  item: ContestQuestionPublished;
}): React.ReactElement {
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_3px_hsl(var(--brand-navy)/0.04)]">
      <div className="border-b border-border/60 bg-muted/15 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {formatContractorQuestionLabel(item.createdAt)}
        </p>
      </div>
      <div className="space-y-3 p-4">
        <ContestDetailProse className="text-foreground">{item.question}</ContestDetailProse>
        <ContestQuestionCommentsList comments={item.comments} variant="contractor" />
      </div>
    </article>
  );
}

function ContestQuestionsContractorTab({
  tenderId,
  allowQuestions,
  submissionDeadline,
  contestStatus,
  isManager = false,
  onQuestionsCountChange,
}: Omit<ContestQuestionsTabProps, 'isContestOwner'>): React.ReactElement {
  const { user, supabase, isLoading: authLoading } = useUserProfile();
  const [published, setPublished] = useState<ContestQuestionPublished[]>([]);
  const [pending, setPending] = useState<ContestQuestionPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deadlinePassed = isContestQuestionsDeadlinePassed(submissionDeadline);
  const canAsk =
    !isManager &&
    allowQuestions &&
    !deadlinePassed &&
    contestStatus === 'active' &&
    Boolean(user?.id);

  const loadQuestions = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    let publishedCount = 0;
    let pendingCount = 0;
    try {
      const publishedResult = await fetchContestQuestionsForContractor(supabase, tenderId);

      if (publishedResult.error) {
        const message = formatPostgrestError(publishedResult.error);
        setLoadError(message);
        setPublished([]);
      } else {
        setPublished(publishedResult.data);
        publishedCount = publishedResult.data.length;
      }

      if (user?.id) {
        const pendingResult = await fetchOwnPendingContestQuestions(supabase, tenderId, user.id);
        if (pendingResult.error) {
          console.warn('Pending contest questions:', formatPostgrestError(pendingResult.error));
          setPending([]);
        } else {
          setPending(pendingResult.data);
          pendingCount = pendingResult.data.length;
        }
      } else {
        setPending([]);
      }
      onQuestionsCountChange?.(publishedCount + pendingCount);
    } finally {
      setLoading(false);
    }
  }, [supabase, tenderId, user?.id, onQuestionsCountChange]);

  useEffect(() => {
    if (authLoading) return;
    void loadQuestions();
  }, [authLoading, loadQuestions]);

  const handleSubmit = async () => {
    if (!questionText.trim()) {
      toast.error('Proszę wpisać pytanie');
      return;
    }
    if (!user?.id || !supabase) {
      toast.error('Musisz być zalogowany aby zadać pytanie');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitQuestion(supabase, tenderId, user.id, questionText.trim());
      if (!result.success) {
        toast.error('Nie udało się wysłać pytania', {
          description: result.error instanceof Error ? result.error.message : undefined,
        });
        return;
      }
      if (result.notifyManagerContestQuestion) {
        void notifyManagerContestQuestionAction(result.notifyManagerContestQuestion);
      }
      toast.success('Pytanie zostało wysłane', {
        description: 'Organizator odpowie publicznie, gdy opublikuje odpowiedź.',
      });
      setQuestionText('');
      await loadQuestions();
    } catch (error) {
      console.error(error);
      toast.error('Wystąpił błąd podczas wysyłania pytania');
    } finally {
      setIsSubmitting(false);
    }
  };

  const blockedReason = !user?.id
    ? 'Zaloguj się, aby zadać pytanie.'
    : !allowQuestions
      ? 'Pytania do tego konkursu są wyłączone.'
      : deadlinePassed
        ? 'Termin składania ofert minął — nie można już zadawać pytań.'
        : contestStatus !== 'active'
          ? 'Pytania można zadawać tylko w trakcie zbierania ofert.'
          : null;

  return (
    <TabsContent value="contest-qa" className="mt-0 focus-visible:outline-none">
      <ContestDetailTabPanel>
        <ContestDetailSection
          icon={MessageCircleQuestion}
          title="Pytania i odpowiedzi"
          description="Odpowiedzi organizatora są widoczne dla wszystkich wykonawców. Tożsamość autora pytania pozostaje anonimowa."
        >
          {loadError ? (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {loadError}
            </p>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Ładowanie pytań...
            </div>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Twoje oczekujące pytania
                  </p>
                  {pending.map((item) => (
                    <PendingQuestionCard key={item.id} question={item.question} />
                  ))}
                </div>
              ) : null}

              {published.length === 0 && pending.length === 0 ? (
                <ContestDetailEmptyState>Brak opublikowanych pytań i odpowiedzi.</ContestDetailEmptyState>
              ) : (
                <div className="space-y-3">
                  {published.map((item) => (
                    <PublishedQuestionCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </ContestDetailSection>

        {canAsk ? (
          <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_1px_3px_hsl(var(--brand-navy)/0.04)]">
            <div className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
              <h3 className="text-sm font-semibold text-foreground">Zadaj pytanie do konkursu</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pytanie trafi do organizatora i po publikacji odpowiedzi będzie widoczne dla wszystkich.
              </p>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="space-y-2">
                <Label htmlFor="contest-question">Treść pytania</Label>
                <Textarea
                  id="contest-question"
                  placeholder="Np. Czy papa ma być układana jednowarstwowo czy dwu?"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={() => void handleSubmit()}
                disabled={!questionText.trim() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Wyślij pytanie
                  </>
                )}
              </Button>
            </div>
          </section>
        ) : !isManager && blockedReason ? (
          <p
            className={cn(
              'rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm text-muted-foreground',
            )}
          >
            {blockedReason}
          </p>
        ) : null}
      </ContestDetailTabPanel>
    </TabsContent>
  );
}

export function ContestQuestionsTab({
  tenderId,
  allowQuestions,
  submissionDeadline,
  contestStatus,
  isContestOwner = false,
  isManager = false,
  onQuestionsCountChange,
}: ContestQuestionsTabProps): React.ReactElement {
  if (isContestOwner) {
    return (
      <ContestQuestionsManagerTab
        tenderId={tenderId}
        onQuestionsCountChange={onQuestionsCountChange}
      />
    );
  }

  return (
    <ContestQuestionsContractorTab
      tenderId={tenderId}
      allowQuestions={allowQuestions}
      submissionDeadline={submissionDeadline}
      contestStatus={contestStatus}
      isManager={isManager}
      onQuestionsCountChange={onQuestionsCountChange}
    />
  );
}
