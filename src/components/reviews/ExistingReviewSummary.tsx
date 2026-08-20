import type { ReactElement } from 'react';
import Image from 'next/image';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';
import { StarRatingDisplay } from './StarRatingDisplay';
import { formatReviewDate } from './ratings-dashboard-utils';

interface ExistingReviewSummaryProps {
  description: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  imageUrls?: string[];
  onClose?: () => void;
}

export function ExistingReviewSummary({
  description,
  rating,
  comment,
  createdAt,
  imageUrls = [],
  onClose,
}: ExistingReviewSummaryProps): ReactElement {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <StarRatingDisplay rating={rating} size="md" />
        <span className="text-sm tabular-nums text-muted-foreground">{rating}/5</span>
      </div>
      {comment ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{comment}</p>
      ) : null}
      {imageUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="relative block h-20 w-20 overflow-hidden rounded-md border"
            >
              <Image src={url} alt="Zdjęcie z opinii" fill className="object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{formatReviewDate(createdAt)}</p>
      {onClose ? (
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </DialogFooter>
      ) : null}
    </div>
  );
}
