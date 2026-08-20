import type { BuildingInspectionStatus } from '../../types/managed-building';
import { computeInspectionStatus } from '../../types/managed-building';
import { headerNearestVisibleIsoDates, toIsoDate } from './dates';

export type ManagerCalendarEventKind =
  | 'inspection'
  | 'warranty'
  | 'contest'
  | 'order'
  | 'custom';

export const CALENDAR_KIND_LABEL: Record<ManagerCalendarEventKind, string> = {
  inspection: 'Przegląd',
  warranty: 'Gwarancja',
  contest: 'Konkurs',
  order: 'Zamówienie',
  custom: 'Wydarzenie',
};

export const CALENDAR_NOTE_KINDS: ManagerCalendarEventKind[] = [
  'custom',
  'inspection',
  'warranty',
  'contest',
  'order',
];

export function isManagerCalendarEventKind(value: string): value is ManagerCalendarEventKind {
  return Object.prototype.hasOwnProperty.call(CALENDAR_KIND_LABEL, value);
}

export interface CalendarDateGroup {
  dueOn: string;
  events: ManagerCalendarEvent[];
}

export interface ManagerCalendarEvent {
  id: string;
  kind: ManagerCalendarEventKind;
  dueOn: string;
  status: BuildingInspectionStatus;
  title: string;
  entityName: string;
  entityId: string | null;
  buildingName: string | null;
  buildingId: string | null;
  href: string;
  ctaHref: string | null;
  ctaLabel: string | null;
  /** Hour 0–23 when the event has a clock time; otherwise all-day. */
  startHour?: number | null;
}

const KIND_RANK: Record<ManagerCalendarEventKind, number> = {
  inspection: 0,
  warranty: 1,
  contest: 2,
  order: 3,
  custom: 4,
};

const STATUS_RANK: Record<BuildingInspectionStatus, number> = {
  overdue: 0,
  upcoming: 1,
  current: 2,
  unknown: 3,
};

export function calendarEventStatus(
  dueOn: string | null,
  today = new Date(),
): BuildingInspectionStatus {
  return computeInspectionStatus(dueOn, today);
}

export function sortCalendarEvents(events: ManagerCalendarEvent[]): ManagerCalendarEvent[] {
  return [...events].sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    if (a.dueOn !== b.dueOn) return a.dueOn.localeCompare(b.dueOn);
    const hourA = a.startHour ?? -1;
    const hourB = b.startHour ?? -1;
    if (hourA !== hourB) return hourA - hourB;
    const kindDiff = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.title.localeCompare(b.title, 'pl');
  });
}

export function filterCalendarEvents(
  events: ManagerCalendarEvent[],
  filters: {
    kind?: ManagerCalendarEventKind | 'all';
    entityId?: string | null;
    dueOn?: string | null;
  },
): ManagerCalendarEvent[] {
  return events.filter((event) => {
    if (filters.kind && filters.kind !== 'all' && event.kind !== filters.kind) {
      return false;
    }
    if (filters.entityId && event.entityId !== filters.entityId) {
      return false;
    }
    if (filters.dueOn && event.dueOn !== toIsoDate(filters.dueOn)) {
      return false;
    }
    return true;
  });
}

export function uniqueEventDueDates(events: Pick<ManagerCalendarEvent, 'dueOn'>[]): string[] {
  return [...new Set(events.map((event) => toIsoDate(event.dueOn)))];
}

export interface HeaderStripEventPreview {
  id: string;
  title: string;
  dueOn: string;
  kind: ManagerCalendarEventKind;
  href: string;
  entityName: string;
  startHour?: number | null;
}

export interface HeaderNearestStripModel {
  visibleDates: string[];
  eventDates: string[];
  dayEvents: HeaderStripEventPreview[];
  lastPastEvent: HeaderStripEventPreview | null;
  nextFutureEvent: HeaderStripEventPreview | null;
}

export function toHeaderStripEventPreview(event: ManagerCalendarEvent): HeaderStripEventPreview {
  return {
    id: event.id,
    title: event.title,
    dueOn: toIsoDate(event.dueOn),
    kind: event.kind,
    href: event.ctaHref ?? event.href,
    entityName: event.entityName,
    startHour: event.startHour ?? null,
  };
}

function pickPreferredOnDate(
  events: ManagerCalendarEvent[],
  dueOn: string,
): ManagerCalendarEvent | null {
  const onDate = events.filter((event) => toIsoDate(event.dueOn) === dueOn);
  return sortCalendarEvents(onDate)[0] ?? null;
}

export function selectHeaderNearestStrip(
  events: ManagerCalendarEvent[],
  today: Date,
): HeaderNearestStripModel {
  const visibleDates = headerNearestVisibleIsoDates(today);
  const firstVisible = visibleDates[0];
  const lastVisible = visibleDates[visibleDates.length - 1];
  if (!firstVisible || !lastVisible) {
    return {
      visibleDates,
      eventDates: uniqueEventDueDates(events),
      dayEvents: sortCalendarEvents(events).map(toHeaderStripEventPreview),
      lastPastEvent: null,
      nextFutureEvent: null,
    };
  }

  let latestPastDate: string | null = null;
  let earliestFutureDate: string | null = null;
  for (const event of events) {
    const dueOn = toIsoDate(event.dueOn);
    if (dueOn < firstVisible && (latestPastDate === null || dueOn > latestPastDate)) {
      latestPastDate = dueOn;
    }
    if (dueOn > lastVisible && (earliestFutureDate === null || dueOn < earliestFutureDate)) {
      earliestFutureDate = dueOn;
    }
  }

  const lastPast = latestPastDate ? pickPreferredOnDate(events, latestPastDate) : null;
  const nextFuture = earliestFutureDate ? pickPreferredOnDate(events, earliestFutureDate) : null;

  return {
    visibleDates,
    eventDates: uniqueEventDueDates(events),
    dayEvents: sortCalendarEvents(events).map(toHeaderStripEventPreview),
    lastPastEvent: lastPast ? toHeaderStripEventPreview(lastPast) : null,
    nextFutureEvent: nextFuture ? toHeaderStripEventPreview(nextFuture) : null,
  };
}

export function groupEventsByDate(events: ManagerCalendarEvent[]): CalendarDateGroup[] {
  const byDate = new Map<string, ManagerCalendarEvent[]>();
  for (const event of events) {
    const dueOn = toIsoDate(event.dueOn);
    const bucket = byDate.get(dueOn);
    if (bucket) {
      bucket.push(event);
    } else {
      byDate.set(dueOn, [event]);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dueOn, grouped]) => ({
      dueOn,
      events: sortCalendarEvents(grouped),
    }));
}
