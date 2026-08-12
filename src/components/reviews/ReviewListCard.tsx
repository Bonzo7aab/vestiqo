import type { ReactElement } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { StarRatingDisplay } from './StarRatingDisplay';
import {
  formatReviewDate,
  getNameInitials,
  reviewSourceLabel,
  type ReviewSource,
} from './ratings-dashboard-utils';

export interface ReviewListCardProps {
  name: string;
  subtitle?: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  source?: ReviewSource | null;
  imageUrls?: string[];
  onEdit?: () => void;
}

export function ReviewListCard({
  name,
  subtitle,
  rating,
  title,
  comment,
  createdAt,
  source,
  imageUrls,
  onEdit,
}: ReviewListCardProps): ReactElement {
  const sourceLabel = reviewSourceLabel(source ?? null);
  const thumbnails = imageUrls?.filter(Boolean) ?? [];

  return (
    <Card className="transition-colors hover:border-border/80">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="text-xs font-medium text-muted-foreground">
                {getNameInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-foreground">{name}</h3>
                {sourceLabel ? (
                  <Badge variant="outline" className="font-normal">
                    {sourceLabel}
                  </Badge>
                ) : null}
              </div>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
              <StarRatingDisplay rating={rating} />
              {title ? <p className="text-sm font-medium text-foreground">{title}</p> : null}
              {comment ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {comment}
                </p>
              ) : null}
              {thumbnails.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {thumbnails.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative block h-16 w-16 overflow-hidden rounded-md border"
                    >
                      <Image src={url} alt="Zdjęcie z opinii" fill className="object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{formatReviewDate(createdAt)}</p>
            </div>
          </div>
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 self-start"
              onClick={onEdit}
            >
              Zmień ocenę
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
