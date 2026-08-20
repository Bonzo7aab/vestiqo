'use client';

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { MessageSquareText, PenLine, Star } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import type { WrittenReviewListItem } from '../../lib/database/reviews';
import {
  CooperationReviewDialog,
  type CooperationReviewVariant,
} from './CooperationReviewDialog';
import { WrittenReviewEditDialog } from './WrittenReviewEditDialog';
import { RatingOverviewCard } from './RatingOverviewCard';
import { ReviewEmptyState } from './ReviewEmptyState';
import { ReviewListCard } from './ReviewListCard';
import {
  getRatingsCopy,
  getReceivedReviewerLabel,
  getReviewSourceBadge,
  resolveDefaultRatingsTab,
  shouldShowEditAction,
  shouldShowRatingOverview,
  type RatingSummary,
  type RatingsDashboardVariant,
} from './ratings-dashboard-utils';

export interface ReceivedReview {
  id: string;
  reviewerName: string;
  reviewerType: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
}

interface RatingsDashboardProps {
  variant: RatingsDashboardVariant;
  ratingSummary: RatingSummary | null;
  reviews: ReceivedReview[];
  writtenReviews: WrittenReviewListItem[];
}

export function RatingsDashboard({
  variant,
  ratingSummary,
  reviews,
  writtenReviews,
}: RatingsDashboardProps): ReactElement {
  const copy = getRatingsCopy(variant);
  const cooperationVariant: CooperationReviewVariant = variant;
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

  const defaultTab = resolveDefaultRatingsTab(variant, writtenItems.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {shouldShowRatingOverview(ratingSummary) && ratingSummary ? (
        <RatingOverviewCard ratingSummary={ratingSummary} />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Star className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div>
                <p className="font-medium text-foreground">{copy.overviewEmptyTitle}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{copy.overviewEmptyDescription}</p>
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
            writtenItems.map((item) => (
              <ReviewListCard
                key={item.id}
                name={item.counterpartyName}
                rating={item.rating}
                title={item.title}
                comment={item.comment}
                createdAt={item.createdAt}
                source={getReviewSourceBadge(item.tenderId, item.jobId)}
                imageUrls={item.imageUrls}
                onEdit={
                  shouldShowEditAction('issued')
                    ? () => {
                        if (item.tenderId) {
                          setCooperationEditTarget(item);
                          return;
                        }
                        setJobEditTarget(item);
                      }
                    : undefined
                }
              />
            ))
          ) : (
            <ReviewEmptyState
              icon={PenLine}
              title={copy.issuedEmptyTitle}
              description={copy.issuedEmptyDescription}
              action={
                <Button asChild variant="outline">
                  <Link href={copy.issuedEmptyCtaHref}>{copy.issuedEmptyCtaLabel}</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-3">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewListCard
                key={review.id}
                name={review.reviewerName}
                subtitle={getReceivedReviewerLabel(review.reviewerType, variant)}
                rating={review.rating}
                title={review.title}
                comment={review.comment}
                createdAt={review.createdAt}
              />
            ))
          ) : (
            <ReviewEmptyState
              icon={MessageSquareText}
              title={copy.receivedEmptyTitle}
              description={copy.receivedEmptyDescription}
            />
          )}
        </TabsContent>
      </Tabs>

      {cooperationEditTarget?.tenderId ? (
        <CooperationReviewDialog
          open
          onOpenChange={(open) => !open && setCooperationEditTarget(null)}
          variant={cooperationVariant}
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
