'use client';

import React from 'react';
import {
  Building2,
  CalendarClock,
  FileSearch,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { formatDaysRemaining } from '../../utils/tenderHelpers';
import type { Job } from '../../types/job';
import type { AuthUser } from '../../types/auth';
import { ContestApplyOfferButton } from './ContestApplyOfferButton';
import { ContestStatusBadge } from '../manager-dashboard/ContestStatusBadge';
import {
  formatContestLocation,
  formatContestSubmissionDeadline,
} from '../../lib/contest-display';
import { formatContestCategoryLine } from '../../lib/config/categoryConfig';
import { cn } from '../ui/utils';

interface ContestJobCardProps {
  job: Partial<Job> & {
    id: string;
    title: string;
    company: string;
    location: string | { city: string; sublocality_level_1?: string };
    type: string;
    applications?: number;
    urgent?: boolean;
    subcategory?: string;
    category?: string | { name: string; slug?: string };
    contestInfo?: Job['contestInfo'];
    metrics?: Job['metrics'];
  };
  contestStatus: string;
  submissionDeadline: string | null;
  contestCategoryLine?: string;
  deadlineDaysRemaining: number | null;
  isEndingSoon: boolean;
  isExpired?: boolean;
  isBookmarked?: boolean;
  isHighlighted?: boolean;
  isManager?: boolean;
  isLoggedIn?: boolean;
  user?: AuthUser | null;
  hasSubmittedOffer?: boolean;
  hasDraftOffer?: boolean;
  isCheckingOffer?: boolean;
  onClick?: () => void;
  onBookmark?: (jobId: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onApplyClick?: (e: React.MouseEvent) => void;
}

function InlineSep(): React.ReactElement {
  return <span className="text-border shrink-0 select-none" aria-hidden>·</span>;
}

function CategoryLine({ label }: { label?: string }): React.ReactElement | null {
  if (!label) {
    return null;
  }

  return (
    <p className="w-fit max-w-full truncate text-xs font-medium text-muted-foreground" title={label}>
      {label}
    </p>
  );
}

const FOOTER_APPLY_BUTTON_CLASS =
  'h-8 px-3 text-xs font-medium w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground';

export function ContestJobCard({
  job,
  contestStatus,
  submissionDeadline,
  contestCategoryLine,
  deadlineDaysRemaining,
  isEndingSoon,
  isExpired = false,
  isBookmarked = false,
  isHighlighted = false,
  isManager = false,
  isLoggedIn = false,
  user = null,
  hasSubmittedOffer = false,
  hasDraftOffer = false,
  isCheckingOffer = false,
  onClick,
  onBookmark,
  onMouseEnter,
  onMouseLeave,
  onApplyClick,
}: ContestJobCardProps): React.ReactElement {
  const cityDistrict = formatContestLocation(job.location);
  const buildingName = job.contestInfo?.buildingName;
  const locationLabel = job.contestInfo?.buildingAddress?.trim() || cityDistrict;
  const categoryLine =
    contestCategoryLine ??
    formatContestCategoryLine({
      category: job.category,
      subcategory: job.subcategory,
    });
  const offerCount = job.applications ?? job.metrics?.applications ?? 0;
  const bookmarkTooltip = isBookmarked ? 'Usuń z zapisanych' : 'Dodaj do zapisanych';

  const handleBookmarkClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onBookmark?.(job.id);
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all w-full max-w-full overflow-hidden py-0 gap-0',
        isExpired ? 'bg-muted/40 opacity-70' : 'bg-card hover:shadow-sm hover:border-primary/25',
        isHighlighted && 'border-primary shadow-sm ring-1 ring-primary/20',
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="p-4 md:p-4 space-y-3">
        {/* Icon + title/status + categories */}
        <div className="mb-6 flex items-stretch gap-3">
          <div
            className="flex w-11 shrink-0 items-center justify-center self-stretch rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <FileSearch className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <h3
                  className={cn(
                    'font-semibold text-sm md:text-base leading-tight line-clamp-2',
                    isExpired && 'text-muted-foreground',
                  )}
                >
                  {job.title}
                </h3>
                <ContestStatusBadge status={contestStatus} />
                {isExpired ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                    Wygasłe
                  </Badge>
                ) : null}
                {job.urgent ? (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-normal">
                    Pilne
                  </Badge>
                ) : null}
              </div>

              {!isManager && onBookmark ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 shrink-0 -mr-1 text-muted-foreground hover:text-foreground',
                        isBookmarked && 'text-primary',
                      )}
                      onClick={handleBookmarkClick}
                      aria-label={bookmarkTooltip}
                    >
                      <Star className={cn('h-3.5 w-3.5', isBookmarked && 'fill-current text-primary')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{bookmarkTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>

            <CategoryLine label={categoryLine} />
          </div>
        </div>

        {/* Organizer + property */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground truncate max-w-[45%]">{job.company}</span>
          <InlineSep />
          <span className="truncate">{cityDistrict}</span>
          {buildingName ? (
            <>
              <InlineSep />
              <span className="inline-flex items-center gap-1 min-w-0 truncate text-foreground/80">
                <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{buildingName}</span>
              </span>
            </>
          ) : null}
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{locationLabel}</span>
        </div>

        {/* Deadline (with offer count) + apply CTA */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between pt-1">
          {submissionDeadline ? (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
                    Zakończenie zbierania ofert
                  </p>
                  <p className={cn('mt-1 text-xs font-semibold', isEndingSoon && 'text-orange-700')}>
                    {formatContestSubmissionDeadline(submissionDeadline)}
                    {isEndingSoon && deadlineDaysRemaining !== null ? (
                      <span className="ml-1 font-normal text-orange-600">
                        ({formatDaysRemaining(deadlineDaysRemaining)})
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-xs">
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-semibold tabular-nums whitespace-nowrap">{offerCount}</span>
                <span className="text-muted-foreground whitespace-nowrap">ofert</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span className="font-semibold tabular-nums text-foreground">{offerCount}</span>
              <span>ofert</span>
            </div>
          )}

          {!isManager && onApplyClick ? (
            <div
              className="flex shrink-0 sm:ml-3"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ContestApplyOfferButton
                className={FOOTER_APPLY_BUTTON_CLASS}
                size="sm"
                isLoggedIn={isLoggedIn}
                user={user}
                hasSubmittedOffer={hasSubmittedOffer}
                hasDraftOffer={hasDraftOffer}
                isCheckingOffer={isCheckingOffer}
                onApply={onApplyClick}
              />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
