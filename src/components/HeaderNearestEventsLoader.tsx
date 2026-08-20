import { fetchUserPrimaryCompany } from '../lib/database/companies';
import { fetchManagerCalendarEvents } from '../lib/database/manager-calendar';
import {
  selectHeaderNearestStrip,
  type HeaderStripEventPreview,
} from '../lib/calendar/manager-calendar-events';
import {
  CALENDAR_TIME_ZONE,
  isoDateInTimeZone,
  parseIsoDateLocal,
} from '../lib/calendar/dates';
import { createClient } from '../lib/supabase/server';
import { HeaderNearestEventsStrip } from './HeaderNearestEventsStrip';

interface HeaderNearestEventsLoaderProps {
  userId: string;
}

export async function HeaderNearestEventsLoader({
  userId,
}: HeaderNearestEventsLoaderProps) {
  const supabase = await createClient();
  const todayIso = isoDateInTimeZone(CALENDAR_TIME_ZONE);
  let eventDates: string[] = [];
  let dayEvents: HeaderStripEventPreview[] = [];
  let lastPastEvent: HeaderStripEventPreview | null = null;
  let nextFutureEvent: HeaderStripEventPreview | null = null;

  try {
    const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
    if (company) {
      const events = await fetchManagerCalendarEvents(supabase, company.id);
      const today = parseIsoDateLocal(todayIso) ?? new Date();
      const model = selectHeaderNearestStrip(events, today);
      eventDates = model.eventDates;
      dayEvents = model.dayEvents;
      lastPastEvent = model.lastPastEvent;
      nextFutureEvent = model.nextFutureEvent;
    }
  } catch (error) {
    console.warn('[header-calendar] failed to load nearest events', error);
  }

  return (
    <HeaderNearestEventsStrip
      todayIso={todayIso}
      eventDates={eventDates}
      dayEvents={dayEvents}
      lastPastEvent={lastPastEvent}
      nextFutureEvent={nextFutureEvent}
    />
  );
}
