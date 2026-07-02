'use client';

import React from 'react';
import {
  Building2,
  Clock,
  MapPin,
  Star,
  Users,
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

function offerCountLabel(count: number): string {
  if (count === 1) return '1 oferta';
  if (count >= 2 && count <= 4) return `${count} oferty`;
  return `${count} ofert`;
}

function OfferCountPill({ count }: { count: number }): React.ReactElement {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      <Users className="h-3 w-3 shrink-0" aria-hidden />
      <span className="tabular-nums text-foreground">{count}</span>
      <span>{count === 1 ? 'oferta' : count >= 2 && count <= 4 ? 'oferty' : 'ofert'}</span>
    </span>
  );
}

function ListingStatusBadge({ status }: { status: string }): React.ReactElement {
  const label = getContestWorkflowStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
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

interface ContestMetaRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}

function ContestMetaRow({
  icon,
  label,
  value,
  valueClassName,
}: ContestMetaRowProps): React.ReactElement {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn('mt-0.5 text-sm leading-snug text-foreground', valueClassName)} title={value}>
          {value}
        </p>
      </div>
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

  const deadlineValue = submissionDeadline
    ? [
        deadlineDaysRemaining !== null && !isExpired
          ? `Zostało ${formatDaysRemaining(deadlineDaysRemaining)}`
          : null,
        formatContestSubmissionDeadline(submissionDeadline),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const handleBookmarkClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onBookmark?.(job.id);
  };

  const stopActionClick = (e: React.MouseEvent | React.PointerEvent): void => {
    e.stopPropagation();
  };

  const bookmarkButton = showActions && onBookmark ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0 text-muted-foreground hover:text-primary',
            isBookmarked && 'text-primary',
          )}
          onClick={handleBookmarkClick}
          aria-label={bookmarkTooltip}
        >
          <Star className={cn('h-4 w-4', isBookmarked && 'fill-current text-primary')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{bookmarkTooltip}</p>
      </TooltipContent>
    </Tooltip>
  ) : null;

  return (
    <Card
      className={cn(
        'cursor-pointer overflow-hidden py-0 gap-0 rounded-2xl border border-border/60 border-l-[3px] bg-card shadow-sm shadow-black/[0.04] w-full max-w-full',
        'transition-all duration-200 ease-out',
        isExpired
          ? 'bg-muted/50 opacity-75'
          : 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 active:translate-y-0 active:shadow-sm',
        isHighlighted && 'border-primary shadow-md ring-1 ring-primary/20',
      )}
      style={{
        borderLeftColor: `color-mix(in srgb, ${categoryColor} 55%, transparent)`,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="p-0">
        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="space-y-3 p-3.5">
            <div className="flex items-start gap-3">
              <CategoryIconTile
                categorySlug={categorySlug}
                color={categoryColor}
                className="h-10 w-10 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        'line-clamp-2 text-[15px] font-semibold leading-snug text-foreground',
                        isExpired && 'text-muted-foreground',
                      )}
                      title={job.title}
                    >
                      {job.title}
                    </h3>
                    {secondaryLine ? (
                      <p className="mt-1 text-xs text-muted-foreground" title={secondaryLine}>
                        {secondaryLine}
                      </p>
                    ) : null}
                  </div>
                  {bookmarkButton}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ListingStatusBadge status={contestStatus} />
                  {isManager ? <OfferCountPill count={offerCount} /> : null}
                </div>
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
              <ContestMetaRow
                icon={<Building2 className="h-4 w-4" />}
                label="Zarządca"
                value={job.company}
                valueClassName="font-medium"
              />
              <ContestMetaRow
                icon={<MapPin className="h-4 w-4" />}
                label="Lokalizacja"
                value={locationLabel}
              />
              {deadlineValue ? (
                <ContestMetaRow
                  icon={<Clock className="h-4 w-4" />}
                  label="Termin składania ofert"
                  value={deadlineValue}
                  valueClassName={cn(
                    'font-medium',
                    isExpired && 'text-muted-foreground',
                    !isExpired && isEndingSoon && 'text-destructive',
                  )}
                />
              ) : null}
              {!isManager && !showActions ? (
                <ContestMetaRow
                  icon={<Users className="h-4 w-4" />}
                  label="Złożone oferty"
                  value={offerCountLabel(offerCount)}
                  valueClassName="font-medium tabular-nums"
                />
              ) : null}
            </div>

            {showActions ? (
              <div
                className="flex items-center gap-2.5 border-t border-border/50 pt-3"
                onClick={stopActionClick}
                onPointerDown={stopActionClick}
              >
                <div className="shrink-0 rounded-lg border border-border/60 bg-background px-2.5 py-2 text-center">
                  <p className="text-lg font-bold leading-none tabular-nums text-foreground">
                    {offerCount}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">ofert</p>
                </div>
                {onApplyClick ? (
                  <ContestApplyOfferButton
                    className="h-10 min-h-0 flex-1 px-3 text-sm font-semibold"
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
            ) : null}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex md:w-full md:items-stretch">
          <div className="min-w-0 flex-1 p-4 md:pr-3">
            <div className="flex items-start gap-3">
              <CategoryIconTile categorySlug={categorySlug} color={categoryColor} />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3
                      className={cn(
                        'line-clamp-2 font-bold text-base leading-snug text-foreground',
                        isExpired && 'text-muted-foreground',
                      )}
                      title={job.title}
                    >
                      {job.title}
                    </h3>
                    {secondaryLine ? (
                      <p
                        className="mt-0.5 truncate text-sm text-muted-foreground"
                        title={secondaryLine}
                      >
                        {secondaryLine}
                      </p>
                    ) : null}
                  </div>

                  {!isManager ? (
                    <div className="flex shrink-0 items-start">
                      <ListingStatusBadge status={contestStatus} />
                    </div>
                  ) : null}
                </div>

                {isManager ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <ListingStatusBadge status={contestStatus} />
                    <OfferCountPill count={offerCount} />
                  </div>
                ) : null}

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate font-medium">{job.company}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{locationLabel}</span>
                  </div>
                </div>

                {submissionDeadline ? (
                  <div
                    className={cn(
                      'mt-3 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium',
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
                      <span className="h-3 w-px shrink-0 bg-current/25" aria-hidden />
                    ) : null}
                    <span className="truncate">
                      {formatContestSubmissionDeadline(submissionDeadline)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {!isManager ? (
            <div className="flex shrink-0 border-l border-border/60 self-stretch">
              <div
                className="flex min-h-full w-36 flex-col p-3 lg:w-40"
                onClick={stopActionClick}
                onPointerDown={stopActionClick}
              >
                {showActions && onBookmark ? (
                  <div className="mb-1 flex justify-end">{bookmarkButton}</div>
                ) : null}

                <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-center">
                  <span className="text-2xl font-bold leading-none tabular-nums text-foreground">
                    {offerCount}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">ofert</span>
                </div>

                {showActions && onApplyClick ? (
                  <ContestApplyOfferButton
                    className="h-9 w-full text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
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
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
