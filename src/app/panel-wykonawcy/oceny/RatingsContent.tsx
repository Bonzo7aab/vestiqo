"use client";

import { useEffect, useState, type ReactElement } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import type { WrittenReviewListItem } from '../../../lib/database/reviews';
import {
  CooperationReviewDialog,
  type CooperationReviewVariant,
} from '../../../components/reviews/CooperationReviewDialog';
import { WrittenReviewEditDialog } from '../../../components/reviews/WrittenReviewEditDialog';

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

interface RatingsContentProps {
  ratingSummary: RatingSummary | null;
  reviews: Review[];
  writtenReviews: WrittenReviewListItem[];
  cooperationReviewVariant: CooperationReviewVariant;
  writtenEmptyDescription?: string;
}

function RatingSummaryCard({ ratingSummary }: { ratingSummary: RatingSummary }): ReactElement {
  const fullStars = Math.floor(ratingSummary.averageRating);
  const hasHalfStar = ratingSummary.averageRating - fullStars >= 0.25;

  return (
    <Card className="overflow-hidden border-amber-100/80 bg-gradient-to-br from-amber-50/80 via-background to-background">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:min-w-[200px]">
            <p className="text-sm font-medium text-muted-foreground mb-2">Podsumowanie ocen</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight text-foreground tabular-nums">
                {ratingSummary.averageRating.toFixed(1)}
              </span>
              <span className="mb-2 text-lg text-muted-foreground">/ 5</span>
            </div>
            <div className="mt-3 flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < fullStars || (i === fullStars && hasHalfStar)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/25'
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Na podstawie{' '}
              <span className="font-medium text-foreground">{ratingSummary.totalReviews}</span>{' '}
              {ratingSummary.totalReviews === 1 ? 'opinii' : 'opinii'}
            </p>
          </div>

          <div className="flex-1 w-full max-w-xl space-y-2.5">
            <p className="text-sm font-medium text-muted-foreground mb-1">Rozkład ocen</p>
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
                  <span className="flex w-10 items-center gap-1 text-sm text-muted-foreground tabular-nums">
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

export function RatingsContent({
  ratingSummary,
  reviews,
  writtenReviews,
  cooperationReviewVariant,
  writtenEmptyDescription = 'Brak wystawionych ocen konkursów. Oceń konkurs po ukończeniu projektu w sekcji Projekty.',
}: RatingsContentProps): ReactElement {
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

  return (
    <div className="space-y-6">
      {ratingSummary ? <RatingSummaryCard ratingSummary={ratingSummary} /> : null}

      <Tabs defaultValue="received" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="issued">Wystawione ({writtenItems.length})</TabsTrigger>
          <TabsTrigger value="received">Otrzymane ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="issued" className="space-y-4">
          {writtenItems.length > 0 ? (
            writtenItems.map((w) => (
              <Card key={w.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <span className="font-medium">{w.counterpartyName}</span>
                      {w.title ? <p className="text-sm font-medium">{w.title}</p> : null}
                    </div>
                    <span className="shrink-0 text-amber-600 font-semibold whitespace-nowrap">
                      ★ {w.rating}
                    </span>
                  </div>
                  {w.comment ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{w.comment}</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString('pl-PL')}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0"
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
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                {writtenEmptyDescription}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-medium">{review.reviewerName}</h4>
                      <p className="text-sm text-gray-600">
                        {review.reviewerType === 'manager' ? 'Zarządca' : 'Klient prywatny'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {review.title ? (
                    <h5 className="font-medium text-gray-900 mb-2">{review.title}</h5>
                  ) : null}

                  <p className="text-gray-700 mb-3">{review.comment}</p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{new Date(review.createdAt).toLocaleDateString('pl-PL')}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-gray-500 mb-4">
                  <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">Brak opinii</h3>
                  <p>Twoja firma nie ma jeszcze żadnych opinii od klientów.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {cooperationEditTarget?.tenderId ? (
        <CooperationReviewDialog
          open
          onOpenChange={(open) => !open && setCooperationEditTarget(null)}
          variant={cooperationReviewVariant}
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
