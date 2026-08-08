'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { MessageSquareText, PenLine, Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { WrittenReviewListItem } from '../../lib/database/reviews';
import { CooperationReviewDialog } from '../reviews/CooperationReviewDialog';
import { WrittenReviewEditDialog } from '../reviews/WrittenReviewEditDialog';
import { routes } from '../../lib/routes';

interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: { '5': number; '4': number; '3': number; '2': number; '1': number };
}

interface Review {
  id: string;
  reviewerName: string;
  reviewerType: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  helpfulCount: number;
}

interface ManagerOcenaContentProps {
  ratingSummary: RatingSummary | null;
  reviews: Review[];
  writtenReviews: WrittenReviewListItem[];
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }): ReactElement {
  const iconClass = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} na 5`}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${iconClass} ${
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'
          }`}
        />
      ))}
    </span>
  );
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function RatingOverviewCard({ ratingSummary }: { ratingSummary: RatingSummary }): ReactElement {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Średnia ocen firmy</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight tabular-nums text-foreground">
                {ratingSummary.averageRating.toFixed(1)}
              </span>
              <span className="mb-2 text-lg text-muted-foreground">/ 5</span>
            </div>
            <div className="mt-3">
              <StarRow rating={Math.round(ratingSummary.averageRating)} size="md" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Na podstawie{' '}
              <span className="font-medium text-foreground">{ratingSummary.totalReviews}</span>{' '}
              {ratingSummary.totalReviews === 1 ? 'opinii' : 'opinii'}
            </p>
          </div>

          <div className="w-full max-w-md flex-1 space-y-2.5">
            <p className="mb-1 text-sm font-medium text-muted-foreground">Rozkład ocen</p>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count =
                ratingSummary.ratingBreakdown[
                  stars.toString() as keyof typeof ratingSummary.ratingBreakdown
                ] || 0;
              const percentage =
                ratingSummary.totalReviews > 0
                  ? (count / ratingSummary.totalReviews) * 100
                  : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="flex w-10 items-center gap-1 text-sm tabular-nums text-muted-foreground">
                    {stars}
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </span>
                  <Progress value={percentage} className="h-2 flex-1 bg-muted/60" />
                  <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Star;
  title: string;
  description: string;
  action?: ReactElement;
}): ReactElement {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function ManagerOcenaContent({
  ratingSummary,
  reviews,
  writtenReviews,
}: ManagerOcenaContentProps): ReactElement {
  const [writtenItems, setWrittenItems] = useState(writtenReviews);
  const [cooperationEditTarget, setCooperationEditTarget] = useState<WrittenReviewListItem | null>(
    null,
  );
  const [jobEditTarget, setJobEditTarget] = useState<WrittenReviewListItem | null>(null);

  useEffect(() => {
    setWrittenItems(writtenReviews);
  }, [writtenReviews]);

  const handleWrittenReviewUpdated = (
    reviewId: string,
    updated: { rating: number; comment: string },
  ): void => {
    setWrittenItems((prev) =>
      prev.map((item) => (item.id === reviewId ? { ...item, ...updated } : item)),
    );
  };

  const defaultTab = writtenItems.length > 0 ? 'issued' : 'received';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ocena</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Opinie o Twojej firmie oraz oceny współpracy wystawione wykonawcom po rozstrzygnięciu
          konkursów.
        </p>
      </div>

      {ratingSummary && ratingSummary.totalReviews > 0 ? (
        <RatingOverviewCard ratingSummary={ratingSummary} />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Star className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div>
                <p className="font-medium text-foreground">Brak ocen firmy</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Gdy wykonawcy ocenią współpracę z Tobą, średnia pojawi się w tym miejscu.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="issued" className="gap-2 px-4 py-2">
            <PenLine className="h-3.5 w-3.5" aria-hidden />
            Wystawione
            <Badge variant="secondary" className="ml-0.5 tabular-nums">
              {writtenItems.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2 px-4 py-2">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
            Otrzymane
            <Badge variant="secondary" className="ml-0.5 tabular-nums">
              {reviews.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issued" className="space-y-3">
          {writtenItems.length > 0 ? (
            writtenItems.map((w) => (
              <Card key={w.id} className="transition-colors hover:border-border/80">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{w.counterpartyName}</h3>
                        {w.tenderId ? (
                          <Badge variant="outline" className="font-normal">
                            Konkurs
                          </Badge>
                        ) : null}
                      </div>
                      <StarRow rating={w.rating} />
                      {w.title ? (
                        <p className="text-sm font-medium text-foreground">{w.title}</p>
                      ) : null}
                      {w.comment ? (
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {w.comment}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">{formatReviewDate(w.createdAt)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 self-start"
                      onClick={() => {
                        if (w.tenderId) {
                          setCooperationEditTarget(w);
                          return;
                        }
                        setJobEditTarget(w);
                      }}
                    >
                      Zmień ocenę
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={PenLine}
              title="Brak wystawionych ocen"
              description="Oceń współpracę po wyborze oferty w sekcji Konkursy — pomoże to innym zarządcom."
              action={
                <Button asChild variant="outline">
                  <Link href={routes.panelZarzadcyKonkursy}>Przejdź do konkursów</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-3">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <Card key={review.id} className="transition-colors hover:border-border/80">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-semibold text-foreground">{review.reviewerName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {review.reviewerType === 'manager' ? 'Zarządca' : 'Wykonawca'}
                      </p>
                    </div>
                    <StarRow rating={review.rating} />
                  </div>
                  {review.title ? (
                    <p className="mt-3 text-sm font-medium text-foreground">{review.title}</p>
                  ) : null}
                  {review.comment ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatReviewDate(review.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={MessageSquareText}
              title="Brak otrzymanych opinii"
              description="Twoja firma nie ma jeszcze opinii od wykonawców. Pojawią się tu po zakończonej współpracy."
            />
          )}
        </TabsContent>
      </Tabs>

      {cooperationEditTarget?.tenderId ? (
        <CooperationReviewDialog
          open
          onOpenChange={(open) => !open && setCooperationEditTarget(null)}
          variant="manager"
          tenderId={cooperationEditTarget.tenderId}
          counterpartyCompanyId={cooperationEditTarget.counterpartyCompanyId}
          counterpartyCompanyName={cooperationEditTarget.counterpartyName}
          isEditing
          onSubmitted={(updated) =>
            handleWrittenReviewUpdated(cooperationEditTarget.id, updated)
          }
        />
      ) : null}

      {jobEditTarget ? (
        <WrittenReviewEditDialog
          open
          onOpenChange={(open) => !open && setJobEditTarget(null)}
          reviewId={jobEditTarget.id}
          counterpartyName={jobEditTarget.counterpartyName}
          initialRating={jobEditTarget.rating}
          initialComment={jobEditTarget.comment}
          onSaved={(updated) => handleWrittenReviewUpdated(jobEditTarget.id, updated)}
        />
      ) : null}
    </div>
  );
}
