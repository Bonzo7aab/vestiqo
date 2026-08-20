export const CALENDAR_REMINDER_DAYS_AHEAD = 30;

export function parseIsoDateLocal(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return startOfLocalDay(date);
}

export function toIsoDate(value: string | Date): string {
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return value.slice(0, 10);
}

export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const parts = toIsoDate(isoDate).split('-').map((part) => Number.parseInt(part, 10));
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return toIsoDate(isoDate);

  const monthIndex = month - 1 + months;
  const target = new Date(year, monthIndex, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toIsoDate(target);
}

export function formatPolishDate(isoDate: string): string {
  const [year, month, day] = toIsoDate(isoDate).split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

export function startOfLocalDay(today = new Date()): Date {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Monday of the ISO week that contains `date` (local timezone). */
export function startOfIsoWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const weekday = start.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isoWeekDays(weekStart: Date): Date[] {
  const monday = startOfIsoWeek(weekStart);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function formatListDate(isoDate: string): string {
  const date = new Date(`${toIsoDate(isoDate)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatWeekRange(weekStart: Date): string {
  const monday = startOfIsoWeek(weekStart);
  const sunday = addDays(monday, 6);
  const monthShort = (date: Date): string =>
    date.toLocaleDateString('pl-PL', { month: 'short' });
  const year = sunday.getFullYear();
  if (monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()) {
    return `${monday.getDate()}–${sunday.getDate()} ${monthShort(sunday)} ${year}`;
  }
  if (monday.getFullYear() === sunday.getFullYear()) {
    return `${monday.getDate()} ${monthShort(monday)} – ${sunday.getDate()} ${monthShort(sunday)} ${year}`;
  }
  return `${monday.getDate()} ${monthShort(monday)} ${monday.getFullYear()} – ${sunday.getDate()} ${monthShort(sunday)} ${year}`;
}

export function formatWeekdayHeader(date: Date): string {
  const weekday = date.toLocaleDateString('pl-PL', { weekday: 'short' });
  return `${weekday} ${date.getDate()}`;
}

export const CALENDAR_HOUR_START = 7;
export const CALENDAR_HOUR_END = 18;
export const POLISH_WEEKDAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'] as const;
export const CALENDAR_TIME_ZONE = 'Europe/Warsaw';
/** Header strip: today is the second day, with more future days than past. */
export const HEADER_NEAREST_DAYS_BEFORE = 1;
export const HEADER_NEAREST_DAYS_AFTER = 5;

export function polishWeekdayShort(date: Date): string {
  const weekday = date.getDay();
  const mondayIndex = weekday === 0 ? 6 : weekday - 1;
  return POLISH_WEEKDAY_SHORT[mondayIndex] ?? '';
}

export function isoDateInTimeZone(timeZone: string, reference = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(reference);
}

export function headerNearestVisibleIsoDates(today: Date): string[] {
  const start = addDays(startOfLocalDay(today), -HEADER_NEAREST_DAYS_BEFORE);
  const count = HEADER_NEAREST_DAYS_BEFORE + 1 + HEADER_NEAREST_DAYS_AFTER;
  return Array.from({ length: count }, (_, index) => toIsoDate(addDays(start, index)));
}

export function calendarHourRows(): number[] {
  return Array.from(
    { length: CALENDAR_HOUR_END - CALENDAR_HOUR_START + 1 },
    (_, index) => CALENDAR_HOUR_START + index,
  );
}

/** Event hour plus one hour before and after; empty when there are no timed events. */
export function visibleHoursAroundEvents(
  events: Array<{ startHour?: number | null }>,
): number[] {
  const hours = new Set<number>();
  for (const event of events) {
    const hour = event.startHour;
    if (hour == null || !Number.isInteger(hour) || hour < 0 || hour > 23) {
      continue;
    }
    hours.add(hour);
    if (hour > 0) hours.add(hour - 1);
    if (hour < 23) hours.add(hour + 1);
  }
  return [...hours].sort((a, b) => a - b);
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function startOfMonth(date: Date): Date {
  const start = startOfLocalDay(date);
  start.setDate(1);
  return start;
}

export function addMonths(date: Date, months: number): Date {
  const next = startOfLocalDay(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function monthGridDays(monthDate: Date): Date[] {
  const gridStart = startOfIsoWeek(startOfMonth(monthDate));
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

export function formatDayTitle(date: Date): string {
  return date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysUntilIsoDate(isoDate: string, today = new Date()): number {
  const next = new Date(`${toIsoDate(isoDate)}T00:00:00`);
  if (Number.isNaN(next.getTime())) return Number.POSITIVE_INFINITY;
  const start = startOfLocalDay(today);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((next.getTime() - start.getTime()) / msPerDay);
}

export function isDateInReminderWindow(
  dueOn: string,
  today = new Date(),
  daysAhead = CALENDAR_REMINDER_DAYS_AHEAD,
): boolean {
  const daysUntil = daysUntilIsoDate(dueOn, today);
  return daysUntil >= 0 && daysUntil <= daysAhead;
}

export function parseWarrantyMonthsFromOfferDetails(details: unknown): number | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return null;
  }
  const record = details as Record<string, unknown>;
  const candidates = [record.warrantyMonths, record.guaranteeMonths];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.trunc(value);
    }
  }
  return null;
}
