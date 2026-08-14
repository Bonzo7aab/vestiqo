'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import type { ManagerCalendarEvent, ManagerCalendarEventKind } from '../../lib/calendar/manager-calendar-events';
import { formatHourLabel } from '../../lib/calendar/dates';
import { cn } from '../ui/utils';

export const CALENDAR_CREATE_SLOT_HINT = 'Kliknij, aby dodać wydarzenie';

export interface CalendarCreateSlot {
  date: Date;
  startHour: number | null;
}

export function calendarKindChipClass(kind: ManagerCalendarEventKind): string {
  switch (kind) {
    case 'inspection':
      return 'border-l-sky-600 bg-sky-50 text-sky-950 dark:bg-sky-950/40 dark:text-sky-50';
    case 'warranty':
      return 'border-l-amber-600 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50';
    case 'contest':
      return 'border-l-primary bg-primary/10 text-foreground';
    case 'order':
      return 'border-l-muted-foreground bg-muted text-foreground';
    case 'custom':
      return 'border-l-violet-600 bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-50';
  }
}

interface ManagerKalendarzEventChipProps {
  event: ManagerCalendarEvent;
  compact?: boolean;
  onSelect?: (event: ManagerCalendarEvent) => void;
}

export function ManagerKalendarzEventChip({
  event,
  compact = false,
  onSelect,
}: ManagerKalendarzEventChipProps): ReactElement {
  const href = event.ctaHref ?? event.href;
  const timeLabel = event.startHour != null ? formatHourLabel(event.startHour) : null;
  const className = cn(
    'block w-full rounded border border-border border-l-2 p-1.5 text-left hover:opacity-90',
    calendarKindChipClass(event.kind),
    compact && 'px-1.5 py-1',
  );

  const content = (
    <>
      <p className="truncate text-xs font-normal leading-snug text-foreground">{event.title}</p>
      {timeLabel ? (
        <p className="mt-px text-xs font-semibold">{timeLabel}</p>
      ) : null}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        title={event.title}
        onClick={(clickEvent) => {
          clickEvent.stopPropagation();
          onSelect(event);
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      title={event.title}
      onClick={(clickEvent) => {
        clickEvent.stopPropagation();
      }}
    >
      {content}
    </Link>
  );
}

export function ManagerKalendarzEventStack({
  events,
  compact = false,
  onSelect,
}: {
  events: ManagerCalendarEvent[];
  compact?: boolean;
  onSelect: (event: ManagerCalendarEvent) => void;
}): ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  if (events.length === 0) {
    return null;
  }

  const showAll = expanded || events.length <= 2;
  const visibleEvents = showAll ? events : events.slice(0, 2);

  return (
    <div className="space-y-1">
      {visibleEvents.map((event) => (
        <ManagerKalendarzEventChip
          key={event.id}
          event={event}
          compact={compact}
          onSelect={onSelect}
        />
      ))}
      {!showAll ? (
        <button
          type="button"
          className="w-full rounded px-1 py-0.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={(clickEvent) => {
            clickEvent.stopPropagation();
            setExpanded(true);
          }}
        >
          Więcej...
        </button>
      ) : null}
    </div>
  );
}
