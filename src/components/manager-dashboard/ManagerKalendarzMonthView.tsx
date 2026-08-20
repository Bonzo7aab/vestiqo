'use client';

import type { ReactElement } from 'react';
import type { ManagerCalendarEvent } from '../../lib/calendar/manager-calendar-events';
import { sortCalendarEvents } from '../../lib/calendar/manager-calendar-events';
import {
  monthGridDays,
  POLISH_WEEKDAY_SHORT,
  startOfMonth,
  toIsoDate,
} from '../../lib/calendar/dates';
import {
  ManagerKalendarzEventStack,
  CALENDAR_CREATE_SLOT_HINT,
  type CalendarCreateSlot,
} from './ManagerKalendarzEventChip';
import { cn } from '../ui/utils';

interface ManagerKalendarzMonthViewProps {
  events: ManagerCalendarEvent[];
  monthDate: Date;
  onCreateSlot: (slot: CalendarCreateSlot) => void;
  onSelectEvent: (event: ManagerCalendarEvent) => void;
}

export function ManagerKalendarzMonthView({
  events,
  monthDate,
  onCreateSlot,
  onSelectEvent,
}: ManagerKalendarzMonthViewProps): ReactElement {
  const days = monthGridDays(monthDate);
  const monthIndex = startOfMonth(monthDate).getMonth();
  const todayIso = toIsoDate(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border">
        {POLISH_WEEKDAY_SHORT.map((label) => (
          <div
            key={label}
            className="p-3.5 text-center text-sm font-medium text-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = toIsoDate(day);
          const inMonth = day.getMonth() === monthIndex;
          const isToday = iso === todayIso;
          const isPast = iso < todayIso;
          const dayEvents = sortCalendarEvents(
            events.filter((event) => toIsoDate(event.dueOn) === iso),
          );
          return (
            <div
              key={iso}
              className={cn(
                'min-h-28 cursor-pointer select-none border-r border-b border-border p-1.5 align-top transition-colors [&:nth-child(7n)]:border-r-0',
                isPast ? 'bg-muted/70 hover:bg-muted/85' : 'hover:bg-muted/40',
                !inMonth && !isPast && 'bg-muted/20',
              )}
              title={CALENDAR_CREATE_SLOT_HINT}
              onClick={() => onCreateSlot({ date: day, startHour: null })}
            >
              <span
                className={cn(
                  'mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-medium',
                  isToday && 'bg-primary text-primary-foreground',
                  !isToday && inMonth && 'text-foreground',
                  !isToday && !inMonth && 'text-muted-foreground',
                )}
              >
                {day.getDate()}
              </span>
              <ManagerKalendarzEventStack
                events={dayEvents}
                compact
                onSelect={onSelectEvent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
