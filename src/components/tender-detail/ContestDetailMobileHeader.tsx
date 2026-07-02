'use client';

import React, { useMemo, useState } from 'react';
import { Building2, Clock, MapPin } from 'lucide-react';
import type { ContestInfo, Job } from '../../types/job';
import {
  formatContestLocation,
  formatContestSubmissionDeadline,
} from '../../lib/contest-display';
import {
  getCategoryDisplayName,
  getSubcategoryDisplayName,
} from '../../lib/config/categoryConfig';
import { ContestStatusBadge } from '../manager-dashboard/ContestStatusBadge';
import { cn } from '../ui/utils';
import { formatDaysRemaining, getDaysRemaining } from '../../utils/tenderHelpers';
import { CONTEST_TAB_ITEMS } from './TenderContestDetailTabs';

interface ContestDetailMobileHeaderProps {
  job: Job & { contestInfo: ContestInfo };
  activeTab: string;
  contestCategorySlug?: string;
  contestCategoryColor: string;
  contestQuestionsCount: number;
  onTabChange: (tab: string) => void;
}

function getDeadlineMeta(submissionDeadline: string, nowMs: number) {
  const deadlineDate = new Date(submissionDeadline);
  if (Number.isNaN(deadlineDate.getTime())) return null;

  const daysRemaining = getDaysRemaining(deadlineDate);
  const isExpired = deadlineDate.getTime() < nowMs;
  const isEndingSoon = !isExpired && daysRemaining > 0 && daysRemaining <= 6;

  return {
    formatted: formatContestSubmissionDeadline(submissionDeadline),
    remaining: isExpired ? null : formatDaysRemaining(daysRemaining),
    isExpired,
    isEndingSoon,
  };
}

export function ContestDetailMobileHeader({
  job,
  activeTab,
  contestCategoryColor,
  contestQuestionsCount,
  onTabChange,
}: ContestDetailMobileHeaderProps): React.ReactElement {
  const categoryName = getCategoryDisplayName({
    slug: typeof job.category === 'object' ? job.category?.slug : undefined,
    name: typeof job.category === 'string' ? job.category : job.category?.name,
  });
  const subcategoryName = job.subcategory
    ? getSubcategoryDisplayName({
        name: job.subcategory,
        categorySlug: typeof job.category === 'object' ? job.category?.slug : undefined,
      }) ?? job.subcategory
    : null;
  const categoryLine = subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;

  const locationLabel =
    job.contestInfo.entityAddress?.trim() || formatContestLocation(job.location);
  const organizerLabel = job.contestInfo.entityName?.trim() || job.company;
  const [renderedAt] = useState(() => Date.now());

  const deadlineMeta = useMemo(
    () =>
      job.contestInfo.submissionDeadline
        ? getDeadlineMeta(job.contestInfo.submissionDeadline, renderedAt)
        : null,
    [job.contestInfo.submissionDeadline, renderedAt],
  );

  return (
    <header className="md:hidden border-b border-border/60 bg-card shadow-sm shadow-black/[0.03]">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: `color-mix(in srgb, ${contestCategoryColor} 70%, transparent)` }}
        aria-hidden
      />

      <div className="space-y-3 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {categoryLine}
          </p>
          {job.status ? (
            <div className="shrink-0">
              <ContestStatusBadge status={job.status} />
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="text-[1.35rem] font-bold leading-snug tracking-tight text-foreground">
            {job.title}
          </h1>
          {organizerLabel ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="line-clamp-2">{organizerLabel}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2 rounded-xl border border-border/50 bg-muted/25 p-3">
          {locationLabel ? (
            <div className="flex items-start gap-2 text-sm text-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 leading-snug">{locationLabel}</span>
            </div>
          ) : null}
          {deadlineMeta ? (
            <div
              className={cn(
                'flex items-start gap-2 text-sm',
                deadlineMeta.isExpired && 'text-muted-foreground',
                deadlineMeta.isEndingSoon && 'text-destructive',
                !deadlineMeta.isExpired && !deadlineMeta.isEndingSoon && 'text-foreground',
              )}
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div className="min-w-0 leading-snug">
                {deadlineMeta.remaining ? (
                  <span className="font-semibold">Zostało {deadlineMeta.remaining}</span>
                ) : null}
                {deadlineMeta.remaining ? (
                  <span className="mx-1.5 text-muted-foreground/60" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className={deadlineMeta.remaining ? 'text-muted-foreground' : 'font-medium'}>
                  {deadlineMeta.formatted}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <nav aria-label="Sekcje konkursu" className="border-t border-border/60 bg-background">
        <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {CONTEST_TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  'relative inline-flex min-h-[3.25rem] shrink-0 items-center gap-2 px-4 text-sm font-semibold transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{tab.shortLabel}</span>
                {tab.value === 'contest-qa' && contestQuestionsCount > 0 ? (
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {contestQuestionsCount}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'absolute inset-x-3 bottom-0 h-0.5 rounded-full transition-colors',
                    isActive ? 'bg-primary' : 'bg-transparent',
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
