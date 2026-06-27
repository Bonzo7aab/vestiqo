'use client';

import React from 'react';
import {
  Building2,
  Clock,
  Heart,
  MapPin,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { formatDaysRemaining } from '../../utils/tenderHelpers';
import type { Job } from '../../types/job';
import type { AuthUser } from '../../types/auth';
import { ContestApplyOfferButton } from './ContestApplyOfferButton';
import {
  formatContestLocation,
  formatContestSubmissionDeadline,
} from '../../lib/contest-display';
import { getContestWorkflowStatusLabel } from '../../lib/tender-workflow-status';
import {
  formatContestCategoryLine,
  getCategoryColor,
  getCategoryDisplayName,
  getSubcategoryDisplayName,
  resolveCategorySlugFromJob,
} from '../../lib/config/categoryConfig';
import { CategoryIconTile } from './CategoryIconTile';
import { cn } from '../ui/utils';

interface ContestJobCardProps {
  job: Partial<Job> & {
    id: string;
    title: string;
    company: string;
    location: string | { city: string; sublocality_level_1?: string };
    type: string;
    applications?: number;
    visits_count?: number;
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

const FOOTER_APPLY_BUTTON_CLASS =
  'h-9 w-full text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground';

function ListingStatusBadge({ status }: { status: string }): React.ReactElement {
  const label = getContestWorkflowStatusLabel(status).toUpperCase();

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide whitespace-nowrap',
        status === 'active' && 'bg-primary/10 text-primary',
        status === 'evaluation' && 'bg-primary/15 text-primary',
        status === 'no_offers' && 'bg-muted text-muted-foreground',
        status === 'awarded' && 'bg-emerald-50 text-emerald-700',
        status === 'draft' && 'bg-muted text-muted-foreground',
        status === 'cancelled' && 'bg-destructive/10 text-destructive',
        !['active', 'evaluation', 'no_offers', 'awarded', 'draft', 'cancelled'].includes(status) &&
          'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

function ContestStatsSidebar({
  offerCount,
  isBookmarked,
  bookmarkTooltip,
  onBookmark,
  showBookmark,
  showApply,
  isLoggedIn,
  user,
  hasSubmittedOffer,
  hasDraftOffer,
  isCheckingOffer,
  onApplyClick,
}: {
  offerCount: number;
  isBookmarked: boolean;
  bookmarkTooltip: string;
  onBookmark?: (e: React.MouseEvent) => void;
  showBookmark: boolean;
  showApply: boolean;
  isLoggedIn: boolean;
  user: AuthUser | null;
  hasSubmittedOffer: boolean;
  hasDraftOffer: boolean;
  isCheckingOffer: boolean;
  onApplyClick?: (e: React.MouseEvent) => void;
}): React.ReactElement {
  return (
    <div className="flex min-h-full flex-col justify-between gap-4 p-4 md:w-40 lg:w-44">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-muted-foreground">Złożone oferty:</span>
          <span className="shrink-0 font-semibold tabular-nums text-foreground">{offerCount}</span>
        </div>

        {showBookmark && onBookmark ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 shrink-0 -mr-1 text-muted-foreground hover:text-primary',
                  isBookmarked && 'text-primary',
                )}
                onClick={onBookmark}
                aria-label={bookmarkTooltip}
              >
                <Heart
                  className={cn('h-4 w-4', isBookmarked && 'fill-current text-primary')}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{bookmarkTooltip}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {showApply && onApplyClick ? (
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
      ) : null}
    </div>
  );
}

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
  const locationLabel = job.contestInfo?.entityAddress?.trim() || cityDistrict;
  const categorySlug = resolveCategorySlugFromJob({ category: job.category });
  const categoryColor = categorySlug ? getCategoryColor(categorySlug) : 'hsl(var(--primary))';

  const categoryLine =
    contestCategoryLine ??
    formatContestCategoryLine({
      category: job.category,
      subcategory: job.subcategory,
    });
  const subcategoryLabel = getSubcategoryDisplayName({
    name: job.subcategory,
    categorySlug,
  });
  const secondaryLine =
    subcategoryLabel ??
    getCategoryDisplayName({
      slug: categorySlug,
      name: typeof job.category === 'string' ? job.category : job.category?.name,
    }) ??
    categoryLine;

  const offerCount = job.applications ?? job.metrics?.applications ?? 0;
  const bookmarkTooltip = isBookmarked ? 'Usuń z zapisanych' : 'Dodaj do zapisanych';
  const showActions = !isManager && (onBookmark || onApplyClick);

  const handleBookmarkClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onBookmark?.(job.id);
  };

  const stopSidebarClick = (e: React.MouseEvent | React.PointerEvent): void => {
    e.stopPropagation();
  };

  return (
    <Card
      className={cn(
        'cursor-pointer overflow-hidden py-0 gap-0 rounded-xl border border-border/60 border-l-[3px] bg-muted/25 shadow-sm shadow-black/5 transition-shadow w-full max-w-full',
        isExpired ? 'bg-muted/40 opacity-70' : 'hover:shadow-md hover:shadow-black/8',
        isHighlighted && 'border-primary shadow-md ring-1 ring-primary/20',
      )}
      style={{
        borderLeftColor: `color-mix(in srgb, ${categoryColor} 38%, transparent)`,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-stretch">
          {/* Left content */}
          <div className="relative min-w-0 flex-1 p-4 md:pr-3">
            <div className="absolute top-4 right-4 md:right-3">
              <ListingStatusBadge status={contestStatus} />
            </div>

            <div className="flex items-start gap-3 pr-28 sm:pr-32">
              <CategoryIconTile categorySlug={categorySlug} color={categoryColor} />

              <div className="min-w-0 flex-1 space-y-1">
                <h3
                  className={cn(
                    'font-bold text-base leading-snug line-clamp-2 text-foreground',
                    isExpired && 'text-muted-foreground',
                  )}
                >
                  {job.title}
                </h3>
                {secondaryLine ? (
                  <p
                    className="truncate text-sm text-muted-foreground"
                    title={secondaryLine}
                  >
                    {secondaryLine}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">{job.company}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{locationLabel}</span>
              </div>
            </div>

            {submissionDeadline ? (
              <div
                className={cn(
                  'mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium',
                  isExpired && 'bg-muted text-muted-foreground',
                  !isExpired && isEndingSoon && 'bg-destructive/10 text-destructive',
                  !isExpired && !isEndingSoon && 'bg-muted/80 text-muted-foreground',
                )}
              >
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {deadlineDaysRemaining !== null && !isExpired ? (
                  <span className="whitespace-nowrap">
                    Zostało {formatDaysRemaining(deadlineDaysRemaining)}
                  </span>
                ) : null}
                {deadlineDaysRemaining !== null && !isExpired ? (
                  <span className="h-3.5 w-px shrink-0 bg-current/25" aria-hidden />
                ) : null}
                <span className="truncate">
                  {formatContestSubmissionDeadline(submissionDeadline)}
                </span>
              </div>
            ) : null}
          </div>

          {/* Divider */}
          <div className="border-t border-border/60 md:border-t-0 md:border-l md:self-stretch" />

          {/* Right sidebar */}
          <div
            className="shrink-0"
            onClick={stopSidebarClick}
            onPointerDown={stopSidebarClick}
          >
            <ContestStatsSidebar
              offerCount={offerCount}
              isBookmarked={isBookmarked}
              bookmarkTooltip={bookmarkTooltip}
              onBookmark={handleBookmarkClick}
              showBookmark={Boolean(showActions && onBookmark)}
              showApply={Boolean(showActions && onApplyClick)}
              isLoggedIn={isLoggedIn}
              user={user}
              hasSubmittedOffer={hasSubmittedOffer}
              hasDraftOffer={hasDraftOffer}
              isCheckingOffer={isCheckingOffer}
              onApplyClick={onApplyClick}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
