'use client';

import type { ReactElement } from 'react';
import type { ManagerCalendarEvent } from '../../lib/calendar/manager-calendar-events';
import { sortCalendarEvents } from '../../lib/calendar/manager-calendar-events';
import {
  formatHourLabel,
  formatWeekdayHeader,
  toIsoDate,
  visibleHoursAroundEvents,
} from '../../lib/calendar/dates';
import {
  ManagerKalendarzEventStack,
  CALENDAR_CREATE_SLOT_HINT,
  type CalendarCreateSlot,
} from './ManagerKalendarzEventChip';
import { cn } from '../ui/utils';

interface ManagerKalendarzDayViewProps {
  events: ManagerCalendarEvent[];
  day: Date;
  onCreateSlot: (slot: CalendarCreateSlot) => void;
  onSelectEvent: (event: ManagerCalendarEvent) => void;
}

export function ManagerKalendarzDayView({
  events,
  day,
  onCreateSlot,
  onSelectEvent,
}: ManagerKalendarzDayViewProps): ReactElement {
  const dayIso = toIsoDate(day);
  const todayIso = toIsoDate(new Date());
  const dayEvents = sortCalendarEvents(
    events.filter((event) => toIsoDate(event.dueOn) === dayIso),
  );
  const allDay = dayEvents.filter((event) => event.startHour == null);
  const timed = dayEvents.filter((event) => event.startHour != null);
  const hours = visibleHoursAroundEvents(timed);
  const isPast = dayIso < todayIso;
        const dayCellClass = isPast ? 'bg-muted/70 hover:bg-muted/85' : 'hover:bg-muted/40';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="sticky top-0 z-10 grid grid-cols-[5rem_minmax(0,1fr)] border-b border-border bg-card">
        <div />
        <div
          className={cn(
            'cursor-pointer select-none px-3 py-3.5 text-center text-sm font-medium',
            dayIso === todayIso && 'text-primary',
            isPast && 'bg-muted/70 text-muted-foreground',
          )}
          title={CALENDAR_CREATE_SLOT_HINT}
          onClick={() => onCreateSlot({ date: day, startHour: null })}
        >
          {formatWeekdayHeader(day)}
        </div>
      </div>
      <div
        className={cn(
          'grid grid-cols-[5rem_minmax(0,1fr)] border-b border-border',
          isPast && 'bg-muted/70',
        )}
      >
        <div
          className="flex cursor-pointer select-none items-end border-r border-border px-2 py-2 text-xs font-semibold text-muted-foreground"
          title={CALENDAR_CREATE_SLOT_HINT}
          onClick={() => onCreateSlot({ date: day, startHour: null })}
        >
          Cały dzień
        </div>
        <div
          className={cn(
            'min-h-16 cursor-pointer select-none p-1.5',
            dayCellClass,
          )}
          title={CALENDAR_CREATE_SLOT_HINT}
          onClick={() => onCreateSlot({ date: day, startHour: null })}
        >
          <ManagerKalendarzEventStack events={allDay} onSelect={onSelectEvent} />
        </div>
      </div>
      {hours.map((hour, index) => {
        const hourEvents = timed.filter((event) => event.startHour === hour);
        const previousHour = hours[index - 1];
        const skippedGap = previousHour != null && hour !== previousHour + 1;
        return (
          <div
            key={hour}
            className={cn(
              'grid grid-cols-[5rem_minmax(0,1fr)] border-b border-border last:border-b-0',
              skippedGap && 'border-t-4 border-t-muted',
            )}
          >
            <div
              className="flex h-20 cursor-pointer select-none items-end border-r border-border p-2 text-xs font-semibold text-muted-foreground lg:h-28"
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: day, startHour: hour })}
            >
              {formatHourLabel(hour)}
            </div>
            <div
              className={cn(
                'min-h-20 cursor-pointer select-none p-1.5 transition-colors lg:min-h-28',
                dayCellClass,
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: day, startHour: hour })}
            >
              <ManagerKalendarzEventStack events={hourEvents} onSelect={onSelectEvent} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
