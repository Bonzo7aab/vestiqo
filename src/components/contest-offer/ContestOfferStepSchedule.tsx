'use client';

import { AlertTriangle, CalendarDays, MapPin } from 'lucide-react';
import type { ReactElement } from 'react';
import type { ContestInfo } from '../../types/job';
import type { ContestOfferFormData } from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/database/contest-offers';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../ui/utils';
import {
  contestOfferSectionCardClass,
  contestOfferSectionIconClass,
} from './ContestOfferFormalDocBlock';
import {
  ContestOfferFieldError,
  ContestOfferRequiredLabel,
} from './ContestOfferFieldError';

interface ContestOfferStepScheduleProps {
  form: ContestOfferFormData;
  contestInfo: ContestInfo;
  completionWarning: string | null;
  fieldErrors: ContestOfferFieldErrors;
  onPatch: (patch: Partial<ContestOfferFormData>) => void;
}

export function ContestOfferStepSchedule({
  form,
  contestInfo,
  completionWarning,
  fieldErrors,
  onPatch,
}: ContestOfferStepScheduleProps): ReactElement {
  const showSiteVisit = contestInfo.siteVisitType === 'mandatory';

  return (
    <div className="space-y-4">
      <section
        className={cn(
          contestOfferSectionCardClass,
          fieldErrors.proposedCompletionDate && 'border-destructive',
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={contestOfferSectionIconClass}
            aria-hidden
          >
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <ContestOfferRequiredLabel htmlFor="contest-offer-proposedCompletionDate">
              Oferowany termin wykonania
            </ContestOfferRequiredLabel>
            <p className="mt-1 text-sm text-muted-foreground">
              Podaj datę zakończenia prac zgodnie z harmonogramem Twojej oferty.
            </p>
            <div className="mt-3">
              <Input
                id="contest-offer-proposedCompletionDate"
                type="date"
                value={form.proposedCompletionDate}
                onChange={(e) => onPatch({ proposedCompletionDate: e.target.value })}
                className="h-10 w-fit max-w-full border-border/60 bg-white pe-2 dark:bg-card [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:ms-1"
                aria-invalid={Boolean(fieldErrors.proposedCompletionDate)}
              />
            </div>
            <ContestOfferFieldError message={fieldErrors.proposedCompletionDate} />
            {completionWarning ? (
              <div
                className="mt-3 flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100"
                role="status"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <p>{completionWarning}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {showSiteVisit ? (
        <section
          className={cn(
            contestOfferSectionCardClass,
            fieldErrors.siteVisitConfirmed && 'border-destructive',
          )}
        >
          <div className="flex items-start gap-3">
            <div className={contestOfferSectionIconClass} aria-hidden>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <ContestOfferRequiredLabel htmlFor="contest-offer-siteVisitConfirmed">
                Wizja lokalna
              </ContestOfferRequiredLabel>
              <p className="mt-1 text-sm text-muted-foreground">{contestInfo.siteVisitTypeLabel}</p>
              {contestInfo.siteVisitNotes ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {contestInfo.siteVisitNotes}
                </p>
              ) : null}
              <label
                htmlFor="contest-offer-siteVisitConfirmed"
                className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2.5"
              >
                <Checkbox
                  id="contest-offer-siteVisitConfirmed"
                  checked={form.siteVisitConfirmed}
                  onCheckedChange={(v) => onPatch({ siteVisitConfirmed: v === true })}
                  aria-invalid={Boolean(fieldErrors.siteVisitConfirmed)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug text-foreground">
                  Potwierdzam odbycie wizji lokalnej w terminie wskazanym przez zarządcę.
                </span>
              </label>
              <ContestOfferFieldError message={fieldErrors.siteVisitConfirmed} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
