'use client';

import React, { useMemo, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import type { ContestInfo, Job } from '../../types/job';
import {
  formatContestLocation,
  formatContestSubmissionDeadline,
} from '../../lib/contest-display';
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
  contestQuestionsCount,
  onTabChange,
}: ContestDetailMobileHeaderProps): React.ReactElement {
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
    <header className="md:hidden border-b border-border/60 bg-background">
      <div className="space-y-2 px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          {deadlineMeta ? (
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm leading-tight text-foreground">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 text-muted-foreground">Termin</span>
              <span
                className={cn(
                  'min-w-0 truncate font-medium',
                  deadlineMeta.isExpired && 'text-muted-foreground',
                )}
              >
                {deadlineMeta.formatted}
                {deadlineMeta.remaining ? (
                  <span
                    className={cn(
                      'font-semibold',
                      deadlineMeta.isEndingSoon ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {' '}
                    ({deadlineMeta.remaining})
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <span className="flex-1" />
          )}

          {job.status ? (
            <div className="shrink-0">
              <ContestStatusBadge status={job.status} />
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="line-clamp-2 text-xl font-semibold leading-snug tracking-tight text-foreground">
            {job.title}
          </h1>
          {organizerLabel ? (
            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{organizerLabel}</p>
          ) : null}
        </div>

        {locationLabel ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{locationLabel}</span>
          </p>
        ) : null}
      </div>

      <nav aria-label="Sekcje konkursu" className="border-t border-border/60 bg-muted/10">
        <div className="flex overflow-x-auto px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {CONTEST_TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  'relative inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3.5 text-sm font-medium transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <span>{tab.shortLabel}</span>
                {tab.value === 'contest-qa' && contestQuestionsCount > 0 ? (
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {contestQuestionsCount}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-foreground transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
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
