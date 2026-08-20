'use client';

import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { Star } from 'lucide-react';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';
import {
  nextRatingFromKey,
  ratingCaption,
  STAR_RATING_MAX,
  STAR_RATING_MIN,
  starAriaLabel,
} from './star-rating-utils';

interface StarRatingInputProps {
  label: string;
  rating: number;
  onRatingChange: (rating: number) => void;
  required?: boolean;
}

export function StarRatingInput({
  label,
  rating,
  onRatingChange,
  required = true,
}: StarRatingInputProps): ReactElement {
  const [hovered, setHovered] = useState(0);
  const preview = hovered || rating;
  const caption = ratingCaption(preview);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const next = nextRatingFromKey(rating, event.key);
    if (next === null) {
      return;
    }
    event.preventDefault();
    onRatingChange(next);
  };

  return (
    <div>
      <Label className="mb-3 block text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </Label>
      <div
        role="radiogroup"
        aria-label={label}
        aria-required={required}
        className="flex items-center gap-1"
        onKeyDown={handleKeyDown}
      >
        {Array.from({ length: STAR_RATING_MAX }, (_, index) => {
          const star = index + STAR_RATING_MIN;
          const filled = star <= preview;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === rating}
              aria-pressed={star === rating}
              aria-label={starAriaLabel(star, required)}
              onClick={() => onRatingChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="rounded-sm p-0.5 text-muted-foreground/25 outline-none transition-colors hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25',
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <p className="mt-2 min-h-5 text-sm text-muted-foreground">{caption ?? 'Wybierz ocenę'}</p>
    </div>
  );
}
