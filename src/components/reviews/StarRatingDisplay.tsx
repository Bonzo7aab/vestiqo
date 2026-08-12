import type { ReactElement } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../ui/utils';

interface StarRatingDisplayProps {
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRatingDisplay({
  rating,
  size = 'sm',
  className,
}: StarRatingDisplayProps): ReactElement {
  const iconClass = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  const rounded = Math.round(rating);

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${rating} na 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            iconClass,
            star <= rounded
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/25',
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}
