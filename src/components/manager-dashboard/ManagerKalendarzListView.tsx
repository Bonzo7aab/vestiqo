'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import {
  CALENDAR_KIND_LABEL,
  groupEventsByDate,
  type ManagerCalendarEvent,
  type ManagerCalendarEventKind,
} from '../../lib/calendar/manager-calendar-events';
import { daysUntilIsoDate, formatHourLabel, toIsoDate } from '../../lib/calendar/dates';
import { inspectionStatusLabel, type BuildingInspectionStatus } from '../../types/managed-building';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';

interface ManagerKalendarzListViewProps {
  events: ManagerCalendarEvent[];
}

function kindAccentClass(kind: ManagerCalendarEventKind): string {
  switch (kind) {
    case 'inspection':
      return 'border-l-sky-600';
    case 'warranty':
      return 'border-l-amber-600';
    case 'contest':
      return 'border-l-primary';
    case 'order':
      return 'border-l-slate-400';
    case 'custom':
      return 'border-l-violet-600';
  }
}

function kindBadgeClass(kind: ManagerCalendarEventKind): string {
  switch (kind) {
    case 'inspection':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'warranty':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'contest':
      return 'border-primary/20 bg-primary/10 text-foreground';
    case 'order':
      return 'border-border bg-muted text-muted-foreground';
    case 'custom':
      return 'border-violet-200 bg-violet-50 text-violet-800';
  }
}

function statusBadgeClass(status: BuildingInspectionStatus): string {
  switch (status) {
    case 'current':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'upcoming':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

function relativeDayLabel(isoDate: string): string | null {
  const days = daysUntilIsoDate(isoDate);
  if (days === 0) return 'Dziś';
  if (days === 1) return 'Jutro';
  if (days === -1) return 'Wczoraj';
  return null;
}

function parseListDate(isoDate: string): Date | null {
  const date = new Date(`${toIsoDate(isoDate)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function EventActions({ event }: { event: ManagerCalendarEvent }): ReactElement | null {
  const hasDetails = Boolean(event.href && event.href !== event.ctaHref);
  if (!event.ctaHref && !hasDetails) return null;

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      {event.ctaHref && event.ctaLabel ? (
        <Button asChild size="sm">
          <Link href={event.ctaHref}>{event.ctaLabel}</Link>
        </Button>
      ) : null}
      {hasDetails ? (
        <Button asChild size="sm" variant="outline">
          <Link href={event.href}>Szczegóły</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function ManagerKalendarzListView({
  events,
}: ManagerKalendarzListViewProps): ReactElement {
  const groups = groupEventsByDate(events);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {groups.map((group, groupIndex) => {
        const date = parseListDate(group.dueOn);
        const weekday = date
          ? date.toLocaleDateString('pl-PL', { weekday: 'long' })
          : '';
        const monthYear = date
          ? date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
          : group.dueOn;
        const dayNumber = date ? date.getDate() : group.dueOn;
        const relative = relativeDayLabel(group.dueOn);
        const isToday = relative === 'Dziś';

        return (
          <section
            key={group.dueOn}
            className={cn(groupIndex > 0 && 'border-t-[6px] border-muted')}
          >
            <header
              className={cn(
                'flex items-center justify-between gap-3 border-b border-border px-4 py-3',
                isToday ? 'bg-primary/5' : 'bg-muted/40',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <time
                  dateTime={group.dueOn}
                  className={cn(
                    'text-2xl font-semibold tabular-nums leading-none tracking-tight',
                    isToday && 'text-primary',
                  )}
                >
                  {dayNumber}
                </time>
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize leading-tight">{weekday}</p>
                  <p className="text-xs capitalize text-muted-foreground">{monthYear}</p>
                </div>
              </div>
              {relative ? (
                <Badge variant={isToday ? 'default' : 'outline'}>{relative}</Badge>
              ) : null}
            </header>

            <ul>
              {group.events.map((event, index) => {
                const place = event.buildingName
                  ? `${event.entityName} · ${event.buildingName}`
                  : event.entityName;
                return (
                  <li
                    key={event.id}
                    className={cn(
                      'flex flex-col gap-3 border-l-[3px] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between',
                      kindAccentClass(event.kind),
                      index > 0 && 'border-t border-border',
                      'hover:bg-muted/20',
                    )}
                  >
                    <div className="min-w-0 space-y-1.5">
                      <p className="font-medium leading-snug text-foreground">{event.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
                            kindBadgeClass(event.kind),
                          )}
                        >
                          {CALENDAR_KIND_LABEL[event.kind]}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
                            statusBadgeClass(event.status),
                          )}
                        >
                          {inspectionStatusLabel(event.status)}
                        </span>
                        {event.startHour != null ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" aria-hidden />
                            {formatHourLabel(event.startHour)}
                          </span>
                        ) : null}
                      </div>
                      {place && place !== '—' ? (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{place}</span>
                        </p>
                      ) : null}
                    </div>
                    <EventActions event={event} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
