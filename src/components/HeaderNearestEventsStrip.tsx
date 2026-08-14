'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CALENDAR_KIND_LABEL,
  type HeaderStripEventPreview,
} from '../lib/calendar/manager-calendar-events';
import {
  formatHourLabel,
  formatPolishDate,
  headerNearestVisibleIsoDates,
  parseIsoDateLocal,
  polishWeekdayShort,
  toIsoDate,
} from '../lib/calendar/dates';
import { routes } from '../lib/routes';
import { calendarKindChipClass } from './manager-dashboard/ManagerKalendarzEventChip';
import { cn } from './ui/utils';

interface HeaderNearestEventsStripProps {
  eventDates: string[];
  dayEvents: HeaderStripEventPreview[];
  lastPastEvent: HeaderStripEventPreview | null;
  nextFutureEvent: HeaderStripEventPreview | null;
}

interface OpenEventList {
  date: string;
  pinFirstId?: string;
}

function calendarDayHref(isoDate: string): string {
  return `${routes.panelZarzadcyKalendarz}?day=${isoDate}`;
}

function compactEventDate(isoDate: string): string {
  const date = parseIsoDateLocal(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

function eventsForOpenList(
  events: HeaderStripEventPreview[],
  extra: HeaderStripEventPreview[],
  open: OpenEventList,
): HeaderStripEventPreview[] {
  const byId = new Map<string, HeaderStripEventPreview>();
  for (const event of [...events, ...extra]) {
    byId.set(event.id, event);
  }
  const onDate = [...byId.values()].filter((event) => event.dueOn === open.date);
  if (!open.pinFirstId) {
    return onDate;
  }
  const pinned = onDate.filter((event) => event.id === open.pinFirstId);
  const rest = onDate.filter((event) => event.id !== open.pinFirstId);
  return [...pinned, ...rest];
}

function HeaderStripFlankingEvent({
  event,
  label,
  align,
  isOpen,
  onToggle,
}: {
  event: HeaderStripEventPreview;
  label: string;
  align: 'start' | 'end';
  isOpen: boolean;
  onToggle: () => void;
}): ReactElement {
  const Chevron = align === 'start' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      title={`${label}: ${event.title}`}
      className={cn(
        'hidden min-w-[8.5rem] max-w-[11rem] shrink-0 items-center gap-1 rounded-xl border border-l-2 px-2 py-1.5 text-left transition-colors lg:flex lg:max-w-[13rem]',
        calendarKindChipClass(event.kind),
        align === 'end' && 'flex-row-reverse text-right',
        isOpen && 'ring-2 ring-primary/40',
      )}
    >
      <Chevron className="size-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-medium uppercase leading-none tracking-wide opacity-80">
          {label}
        </span>
        <span className="mt-1 block truncate text-xs font-semibold leading-snug text-foreground">
          {event.title}
        </span>
        <span className="mt-0.5 block truncate text-[10px] leading-none text-muted-foreground">
          {compactEventDate(event.dueOn)} · {CALENDAR_KIND_LABEL[event.kind]}
        </span>
      </span>
    </button>
  );
}

export function HeaderNearestEventsStrip({
  eventDates,
  dayEvents,
  lastPastEvent,
  nextFutureEvent,
}: HeaderNearestEventsStripProps): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  const [openList, setOpenList] = useState<OpenEventList | null>(null);
  const today = new Date();
  const todayIso = toIsoDate(today);
  const visibleDates = headerNearestVisibleIsoDates(today);
  const firstVisible = visibleDates[0];
  const lastVisible = visibleDates[visibleDates.length - 1];
  const datesWithEvents = new Set(eventDates);
  const pastEvent =
    lastPastEvent && firstVisible && lastPastEvent.dueOn < firstVisible ? lastPastEvent : null;
  const futureEvent =
    nextFutureEvent && lastVisible && nextFutureEvent.dueOn > lastVisible
      ? nextFutureEvent
      : null;
  const openDayEvents = openList
    ? eventsForOpenList(
        dayEvents,
        [pastEvent, futureEvent].filter((event): event is HeaderStripEventPreview => event !== null),
        openList,
      )
    : [];

  useEffect(() => {
    if (!openList) return undefined;

    const handlePointerDown = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenList(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openList]);

  const toggleDate = (iso: string): void => {
    setOpenList((current) =>
      current?.date === iso && !current.pinFirstId ? null : { date: iso },
    );
  };

  const togglePinnedEvent = (event: HeaderStripEventPreview): void => {
    setOpenList((current) =>
      current?.pinFirstId === event.id ? null : { date: event.dueOn, pinFirstId: event.id },
    );
  };

  return (
    <nav ref={rootRef} className="border-y border-border" aria-label="Najbliższe wydarzenia">
      <div className="mx-auto flex w-full max-w-6xl items-stretch gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {pastEvent ? (
          <HeaderStripFlankingEvent
            event={pastEvent}
            label="Ostatnie"
            align="start"
            isOpen={openList?.pinFirstId === pastEvent.id}
            onToggle={() => togglePinnedEvent(pastEvent)}
          />
        ) : (
          <div className="hidden min-w-[8.5rem] max-w-[11rem] shrink-0 lg:block lg:max-w-[13rem]" />
        )}

        <div className="flex min-w-0 flex-1 items-stretch justify-between gap-0.5 sm:gap-1">
          {visibleDates.map((iso) => {
            const day = parseIsoDateLocal(iso);
            if (!day) return null;
            const isToday = iso === todayIso;
            const isPast = iso < todayIso;
            const isOpen = openList?.date === iso && !openList.pinFirstId;
            const isHighlighted = openList ? isOpen : isToday;
            const hasEvents = datesWithEvents.has(iso);
            const weekday = polishWeekdayShort(day);

            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleDate(iso)}
                aria-current={isToday ? 'date' : undefined}
                aria-expanded={isOpen}
                aria-label={`${weekday} ${day.getDate()}${hasEvents ? ', są wydarzenia' : ''}`}
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-colors',
                  isHighlighted
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : isPast
                      ? 'bg-muted/70 text-muted-foreground hover:bg-muted/85'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                {hasEvents ? (
                  <span
                    className={cn(
                      'absolute right-1.5 top-1 size-1.5 rounded-full',
                      isHighlighted ? 'bg-primary-foreground/90' : 'bg-primary',
                    )}
                    aria-hidden
                  />
                ) : null}
                <span className="text-[11px] font-medium leading-none">{weekday}</span>
                <span
                  className={cn(
                    'mt-1 text-sm leading-none',
                    isHighlighted ? 'font-bold' : 'font-medium',
                  )}
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {futureEvent ? (
          <HeaderStripFlankingEvent
            event={futureEvent}
            label="Następne"
            align="end"
            isOpen={openList?.pinFirstId === futureEvent.id}
            onToggle={() => togglePinnedEvent(futureEvent)}
          />
        ) : (
          <div className="hidden min-w-[8.5rem] max-w-[11rem] shrink-0 lg:block lg:max-w-[13rem]" />
        )}
      </div>

      {openList ? (
        <div className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-2 sm:px-6 lg:px-8">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              {formatPolishDate(openList.date)}
            </p>
            {openDayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Brak wydarzeń w tym dniu</p>
            ) : (
              <ul className="flex flex-col gap-1">
                  {openDayEvents.map((event) => {
                    const timeLabel =
                      event.startHour != null ? formatHourLabel(event.startHour) : null;
                    return (
                      <li key={event.id}>
                        <Link
                          href={calendarDayHref(event.dueOn)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border border-border border-l-2 px-2.5 py-1.5 hover:opacity-90',
                            calendarKindChipClass(event.kind),
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium text-foreground">
                              {event.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {CALENDAR_KIND_LABEL[event.kind]}
                              {event.entityName && event.entityName !== '—'
                                ? ` · ${event.entityName}`
                                : ''}
                              {timeLabel ? ` · ${timeLabel}` : ''}
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
                            <CalendarDays className="size-3.5" aria-hidden />
                            Kalendarz
                            <ChevronRight className="size-3.5" aria-hidden />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export function HeaderNearestEventsStripFallback(): ReactElement {
  return (
    <div className="border-y border-border" aria-hidden>
      <div className="mx-auto flex w-full max-w-6xl items-stretch gap-2 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="hidden h-12 min-w-[8.5rem] max-w-[11rem] shrink-0 rounded-xl bg-muted/40 lg:block lg:max-w-[13rem]" />
        <div className="flex min-w-0 flex-1 items-stretch justify-between gap-0.5 sm:gap-1">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="h-12 flex-1 rounded-xl bg-muted/40" />
          ))}
        </div>
        <div className="hidden h-12 min-w-[8.5rem] max-w-[11rem] shrink-0 rounded-xl bg-muted/40 lg:block lg:max-w-[13rem]" />
      </div>
    </div>
  );
}
