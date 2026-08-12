import type { ReactElement } from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function RatingsDashboardSkeleton(): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-full max-w-md" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="w-full max-w-md flex-1 space-y-3">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-4/5" />
            <Skeleton className="h-2 w-3/5" />
            <Skeleton className="h-2 w-2/5" />
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-72" />
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}

export function ReviewFormSkeleton(): ReactElement {
  return (
    <div className="space-y-5 py-2">
      <Skeleton className="h-4 w-64" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className="h-7 w-7 text-muted-foreground/20" aria-hidden />
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
