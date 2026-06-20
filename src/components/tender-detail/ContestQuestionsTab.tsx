'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../ui/card';
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
    <TabsContent value="contest-qa">
      <Card>
        <CardContent className="min-w-0 space-y-6 p-6">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary shrink-0" />
              Pytania i odpowiedzi do konkursu
            </h3>
            <p className="text-sm text-muted-foreground">
              Odpowiadaj na pytania wykonawców — odpowiedzi są widoczne publicznie. Możesz edytować
              lub usunąć swoje odpowiedzi.
            </p>
          </div>
          <ManagerContestQuestionsPanel
            contestId={tenderId}
            onQuestionsChange={onQuestionsCountChange}
          />
        </CardContent>
      </Card>
    </TabsContent>
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

  return (
    <TabsContent value="contest-qa">
      <Card>
        <CardContent className="min-w-0 space-y-6 p-6">
          <div>
            <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary shrink-0" />
              Pytania i odpowiedzi do konkursu
            </h3>
            <p className="text-sm text-muted-foreground">
              Odpowiedzi zarządcy są widoczne dla wszystkich wykonawców. Tożsamość autora pytania
              pozostaje anonimowa.
            </p>
          </div>

          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Ładowanie pytań...</p>
          ) : (
            <>
              {pending.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Twoje oczekujące pytania
                  </h4>
                  {pending.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-dashed border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2"
                    >
                      <p className="text-xs text-muted-foreground">Oczekuje na odpowiedź zarządcy</p>
                      <p className="text-sm whitespace-pre-wrap">{item.question}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {published.length === 0 && pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak opublikowanych pytań i odpowiedzi.
                </p>
              ) : (
                <div className="space-y-4">
                  {published.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
                    >
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {formatContractorQuestionLabel(item.createdAt)}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{item.question}</p>
                      </div>
                      <ContestQuestionCommentsList
                        comments={item.comments}
                        variant="contractor"
                      />
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {canAsk ? (
            <div className="space-y-3 pt-2 border-t">
              <Label htmlFor="contest-question">Zadaj pytanie do konkursu</Label>
              <Textarea
                id="contest-question"
                placeholder="Np. Czy papa ma być układana jednowarstwowo czy dwu?"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <Button
                onClick={() => void handleSubmit()}
                disabled={!questionText.trim() || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Zadaj pytanie do konkursu
                  </>
                )}
              </Button>
            </div>
          ) : !isManager ? (
            <p className="text-sm text-muted-foreground border-t pt-4">
              {!user?.id
                ? 'Zaloguj się, aby zadać pytanie.'
                : !allowQuestions
                  ? 'Pytania do tego konkursu są wyłączone.'
                  : deadlinePassed
                    ? 'Termin składania ofert minął — nie można już zadawać pytań.'
                    : contestStatus !== 'active'
                      ? 'Pytania można zadawać tylko w trakcie zbierania ofert.'
                      : null}
            </p>
          ) : null}
        </CardContent>
      </Card>
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
