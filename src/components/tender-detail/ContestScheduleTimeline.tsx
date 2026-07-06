'use client';

import { useState } from 'react';
import { cn } from '../ui/utils';

export type ScheduleStepId = 'submission' | 'evaluation' | 'completion';

interface ScheduleStep {
  id: ScheduleStepId;
  title: string;
  dateLabel: string;
}

interface ContestScheduleTimelineProps {
  submissionDeadline: string;
  evaluationDeadline?: string | null;
  completionDate?: string | null;
  contestStatus?: string;
  renderedAt?: number;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLongDate(value: string, withTime = false): string {
  const date = parseDate(value);
  if (!date) return value;

  return date.toLocaleString('pl-PL', withTime ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' });
}

export function resolveActiveScheduleStep(
  contestStatus: string | undefined,
  submissionDeadline: string,
  evaluationDeadline: string | null | undefined,
  completionDate: string | null | undefined,
  now: Date,
): ScheduleStepId {
  const submission = parseDate(submissionDeadline);
  const evaluation = evaluationDeadline ? parseDate(evaluationDeadline) : null;
  const completion = completionDate ? parseDate(completionDate) : null;

  if (contestStatus === 'evaluation' || contestStatus === 'no_offers' || contestStatus === 'cancelled') {
    return 'evaluation';
  }

  if (contestStatus === 'awarded') {
    return 'completion';
  }

  if (contestStatus === 'active' || contestStatus === 'draft') {
    if (submission && now >= submission) {
      return 'evaluation';
    }
    return 'submission';
  }

  if (submission && now < submission) {
    return 'submission';
  }

  if (evaluation && now < evaluation) {
    return 'evaluation';
  }

  if (completion && now < completion) {
    return 'completion';
  }

  return 'completion';
}

export function ContestScheduleTimeline({
  submissionDeadline,
  evaluationDeadline,
  completionDate,
  contestStatus,
  renderedAt,
}: ContestScheduleTimelineProps): React.ReactElement {
  const [renderedAtMs] = useState(() => renderedAt ?? Date.now());
  const now = new Date(renderedAtMs);
  const activeStepId = resolveActiveScheduleStep(
    contestStatus,
    submissionDeadline,
    evaluationDeadline,
    completionDate,
    now,
  );

  const steps: ScheduleStep[] = [
    {
      id: 'submission',
      title: 'Zakończenie przyjmowania ofert',
      dateLabel: formatLongDate(submissionDeadline, true),
    },
    {
      id: 'evaluation',
      title: 'Rozstrzygnięcie konkursu',
      dateLabel: evaluationDeadline ? formatLongDate(evaluationDeadline) : 'Nie określono',
    },
    {
      id: 'completion',
      title: 'Termin wykonania',
      dateLabel: completionDate ? formatLongDate(completionDate) : 'Nie określono',
    },
  ];

  return (
    <ol className="relative m-0 list-none p-0">
      {steps.map((step, index) => {
        const isActive = step.id === activeStepId;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className="flex gap-3.5">
            <div className="flex w-4 shrink-0 flex-col items-center self-stretch">
              <div className="flex h-[14px] shrink-0 items-center justify-center">
                <span
                  aria-hidden
                  className={cn(
                    'z-10 block h-3.5 w-3.5 shrink-0 rounded-full',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/35',
                  )}
                />
              </div>
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'mb-2 mt-2 w-0.5 flex-1',
                    isActive ? 'bg-primary' : 'bg-border',
                  )}
                />
              ) : null}
            </div>

            <div className={cn('min-w-0 flex-1', !isLast && 'pb-9')}>
              <p
                className={cn(
                  'text-[11px] leading-[14px]',
                  isActive ? 'text-primary/80' : 'text-muted-foreground',
                )}
              >
                {step.dateLabel}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm leading-snug',
                  isActive ? 'font-medium text-foreground' : 'font-normal text-muted-foreground',
                )}
              >
                {step.title}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
