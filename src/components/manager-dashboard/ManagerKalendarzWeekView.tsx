'use client';

import type { ReactElement } from 'react';
import type { ManagerCalendarEvent } from '../../lib/calendar/manager-calendar-events';
import { sortCalendarEvents } from '../../lib/calendar/manager-calendar-events';
import {
  addDays,
  formatHourLabel,
  formatWeekdayHeader,
  isoWeekDays,
  startOfIsoWeek,
  toIsoDate,
  visibleHoursAroundEvents,
} from '../../lib/calendar/dates';
import {
  ManagerKalendarzEventStack,
  CALENDAR_CREATE_SLOT_HINT,
  type CalendarCreateSlot,
} from './ManagerKalendarzEventChip';
import { cn } from '../ui/utils';

interface ManagerKalendarzWeekViewProps {
  events: ManagerCalendarEvent[];
  weekStart: Date;
  onCreateSlot: (slot: CalendarCreateSlot) => void;
  onSelectEvent: (event: ManagerCalendarEvent) => void;
}

function eventsForDay(
  events: ManagerCalendarEvent[],
  iso: string,
): ManagerCalendarEvent[] {
  return sortCalendarEvents(events.filter((event) => toIsoDate(event.dueOn) === iso));
}

export function ManagerKalendarzWeekView({
  events,
  weekStart,
  onCreateSlot,
  onSelectEvent,
}: ManagerKalendarzWeekViewProps): ReactElement {
  const monday = startOfIsoWeek(weekStart);
  const days = isoWeekDays(monday);
  const todayIso = toIsoDate(new Date());
  const focusDay = days.find((day) => toIsoDate(day) === todayIso) ?? monday;
  const focusIso = toIsoDate(focusDay);
  const mondayIso = toIsoDate(monday);
  const sundayIso = toIsoDate(addDays(monday, 6));
  const weekEvents = events.filter((event) => {
    const dueOn = toIsoDate(event.dueOn);
    return dueOn >= mondayIso && dueOn <= sundayIso;
  });
  const hours = visibleHoursAroundEvents(weekEvents);

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 hidden grid-cols-8 border-t border-border bg-card sm:grid">
        <div className="p-3.5" />
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isPast = iso < todayIso;
          return (
            <div
              key={iso}
              className={cn(
                'flex cursor-pointer select-none items-center justify-center p-3.5 text-sm font-medium text-foreground',
                iso === todayIso && 'text-primary',
                isPast && 'bg-muted/70 text-muted-foreground',
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: day, startHour: null })}
            >
              {formatWeekdayHeader(day)}
            </div>
          );
        })}
      </div>

      <div className="hidden w-full overflow-x-auto sm:grid sm:grid-cols-8">
        <div
          className="flex min-h-16 cursor-pointer select-none items-end border-t border-r border-border p-2 text-xs font-semibold text-muted-foreground"
          title={CALENDAR_CREATE_SLOT_HINT}
          onClick={() => onCreateSlot({ date: focusDay, startHour: null })}
        >
          Cały dzień
        </div>
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isPast = iso < todayIso;
          const allDay = eventsForDay(weekEvents, iso).filter((event) => event.startHour == null);
          return (
            <div
              key={`all-day-${iso}`}
              className={cn(
                'min-h-16 cursor-pointer select-none border-t border-r border-border p-1.5 last:border-r-0',
                isPast ? 'bg-muted/70 hover:bg-muted/85' : 'hover:bg-muted/40',
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: day, startHour: null })}
            >
              <ManagerKalendarzEventStack
                events={allDay}
                compact
                onSelect={onSelectEvent}
              />
            </div>
          );
        })}

        {hours.map((hour, index) => {
          const previousHour = hours[index - 1];
          const skippedGap = previousHour != null && hour !== previousHour + 1;
          const topBorder = skippedGap ? 'border-t-4 border-t-muted' : 'border-t border-border';
          return (
          <div key={hour} className="contents">
            <div
              className={cn(
                'flex h-20 cursor-pointer select-none items-end border-r p-2 text-xs font-semibold text-muted-foreground lg:h-28',
                topBorder,
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: focusDay, startHour: hour })}
            >
              {formatHourLabel(hour)}
            </div>
            {days.map((day) => {
              const iso = toIsoDate(day);
              const isPast = iso < todayIso;
              const hourEvents = eventsForDay(weekEvents, iso).filter(
                (event) => event.startHour === hour,
              );
              return (
                <div
                  key={`${iso}-${hour}`}
                  className={cn(
                    'min-h-20 cursor-pointer select-none border-r p-1.5 last:border-r-0 transition-colors lg:min-h-28',
                    topBorder,
                    isPast ? 'bg-muted/70 hover:bg-muted/85' : 'hover:bg-muted/40',
                  )}
                  title={CALENDAR_CREATE_SLOT_HINT}
                  onClick={() => onCreateSlot({ date: day, startHour: hour })}
                >
                  <ManagerKalendarzEventStack
                    events={hourEvents}
                    compact
                    onSelect={onSelectEvent}
                  />
                </div>
              );
            })}
          </div>
          );
        })}
      </div>

      <div className="flex w-full items-start border-t border-border sm:hidden">
        <div className="flex flex-col">
          <div
            className="flex h-16 w-20 cursor-pointer select-none items-end border-b border-r border-border p-2 text-xs font-semibold text-muted-foreground"
            title={CALENDAR_CREATE_SLOT_HINT}
            onClick={() => onCreateSlot({ date: focusDay, startHour: null })}
          >
            Cały dzień
          </div>
          {hours.map((hour, index) => {
            const previousHour = hours[index - 1];
            const skippedGap = previousHour != null && hour !== previousHour + 1;
            return (
            <div
              key={`mobile-hour-${hour}`}
              className={cn(
                'flex h-20 w-20 cursor-pointer select-none items-end border-b border-r border-border p-2 text-xs font-semibold text-muted-foreground',
                skippedGap && 'border-t-4 border-t-muted',
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: focusDay, startHour: hour })}
            >
              {formatHourLabel(hour)}
            </div>
            );
          })}
        </div>
        <div className="grid w-full grid-cols-1">
          <div
            className={cn(
              'min-h-16 cursor-pointer select-none border-b border-border p-1.5',
              focusIso < todayIso ? 'bg-muted/70' : '',
            )}
            title={CALENDAR_CREATE_SLOT_HINT}
            onClick={() => onCreateSlot({ date: focusDay, startHour: null })}
          >
            <ManagerKalendarzEventStack
              events={eventsForDay(weekEvents, focusIso).filter(
                (event) => event.startHour == null,
              )}
              compact
              onSelect={onSelectEvent}
            />
          </div>
          {hours.map((hour, index) => {
            const previousHour = hours[index - 1];
            const skippedGap = previousHour != null && hour !== previousHour + 1;
            return (
            <div
              key={`mobile-cell-${hour}`}
              className={cn(
                'min-h-20 cursor-pointer select-none border-b border-border p-1.5',
                skippedGap && 'border-t-4 border-t-muted',
                focusIso < todayIso && 'bg-muted/70',
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: focusDay, startHour: hour })}
            >
              <ManagerKalendarzEventStack
                events={eventsForDay(weekEvents, focusIso).filter(
                  (event) => event.startHour === hour,
                )}
                compact
                onSelect={onSelectEvent}
              />
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
