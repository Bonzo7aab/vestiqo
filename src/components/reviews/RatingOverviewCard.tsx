import type { ReactElement } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { StarRatingDisplay } from './StarRatingDisplay';
import {
  formatOpinionCountLabel,
  type RatingSummary,
} from './ratings-dashboard-utils';

interface RatingOverviewCardProps {
  ratingSummary: RatingSummary;
}

export function RatingOverviewCard({ ratingSummary }: RatingOverviewCardProps): ReactElement {
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
              <StarRatingDisplay rating={ratingSummary.averageRating} size="md" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatOpinionCountLabel(ratingSummary.totalReviews)}
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
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
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
