'use client';

import { useMemo, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import type { ManagerCalendarEvent, ManagerCalendarEventKind } from '../../lib/calendar/manager-calendar-events';
import { filterCalendarEvents } from '../../lib/calendar/manager-calendar-events';
import {
  addDays,
  addMonths,
  formatDayTitle,
  formatMonthTitle,
  formatWeekRange,
  parseIsoDateLocal,
  startOfIsoWeek,
  startOfLocalDay,
  startOfMonth,
} from '../../lib/calendar/dates';
import { KONTO_NIERUCHOMOSCI_HREF } from '../../lib/konto-tabs';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../ui/utils';
import { ManagerKalendarzListView } from './ManagerKalendarzListView';
import { ManagerKalendarzWeekView } from './ManagerKalendarzWeekView';
import { ManagerKalendarzDayView } from './ManagerKalendarzDayView';
import { ManagerKalendarzMonthView } from './ManagerKalendarzMonthView';
import { ManagerKalendarzNewEventDialog } from './ManagerKalendarzNewEventDialog';
import { ManagerKalendarzEventPreviewDialog } from './ManagerKalendarzEventPreviewDialog';
import type { CalendarCreateSlot } from './ManagerKalendarzEventChip';

const KIND_FILTERS: Array<{ id: ManagerCalendarEventKind | 'all'; label: string }> = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'inspection', label: 'Przeglądy' },
  { id: 'warranty', label: 'Gwarancje' },
  { id: 'contest', label: 'Konkursy' },
  { id: 'order', label: 'Zamówienia' },
  { id: 'custom', label: 'Moje' },
];

const KIND_FILTER_SELECTED_CLASS: Record<ManagerCalendarEventKind | 'all', string> = {
  all: 'border-primary bg-primary text-primary-foreground shadow-sm',
  inspection: 'border-sky-600 bg-sky-600 text-white shadow-sm',
  warranty: 'border-amber-600 bg-amber-600 text-white shadow-sm',
  contest: 'border-primary bg-primary text-primary-foreground shadow-sm',
  order: 'border-slate-600 bg-slate-700 text-white shadow-sm',
  custom: 'border-violet-600 bg-violet-600 text-white shadow-sm',
};

type MainView = 'list' | 'calendar';
type CalendarRange = 'day' | 'week' | 'month';

interface ManagerKalendarzContentProps {
  events: ManagerCalendarEvent[];
  initialDay?: string | null;
}

export function ManagerKalendarzContent({
  events,
  initialDay,
}: ManagerKalendarzContentProps): ReactElement {
  const focusedDay = parseIsoDateLocal(initialDay);
  const [kind, setKind] = useState<ManagerCalendarEventKind | 'all'>('all');
  const [entityId, setEntityId] = useState<string>('all');
  const [view, setView] = useState<MainView>(focusedDay ? 'calendar' : 'list');
  const [range, setRange] = useState<CalendarRange>(focusedDay ? 'day' : 'week');
  const [focusDate, setFocusDate] = useState(() => focusedDay ?? startOfLocalDay(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftSlot, setDraftSlot] = useState<CalendarCreateSlot | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [previewEvent, setPreviewEvent] = useState<ManagerCalendarEvent | null>(null);

  const entities = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      if (event.entityId && event.entityName && event.entityName !== '—') {
        map.set(event.entityId, event.entityName);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pl'));
  }, [events]);

  const visible = useMemo(
    () =>
      filterCalendarEvents(events, {
        kind,
        entityId: entityId === 'all' ? null : entityId,
      }),
    [events, kind, entityId],
  );

  const calendarTitle =
    range === 'day'
      ? formatDayTitle(focusDate)
      : range === 'week'
        ? formatWeekRange(focusDate)
        : formatMonthTitle(focusDate);

  const goToday = (): void => {
    setFocusDate(startOfLocalDay(new Date()));
  };

  const goPrev = (): void => {
    if (range === 'day') setFocusDate(addDays(focusDate, -1));
    else if (range === 'week') setFocusDate(addDays(startOfIsoWeek(focusDate), -7));
    else setFocusDate(addMonths(startOfMonth(focusDate), -1));
  };

  const goNext = (): void => {
    if (range === 'day') setFocusDate(addDays(focusDate, 1));
    else if (range === 'week') setFocusDate(addDays(startOfIsoWeek(focusDate), 7));
    else setFocusDate(addMonths(startOfMonth(focusDate), 1));
  };

  const openCreateDialog = (slot?: CalendarCreateSlot): void => {
    const nextSlot = slot ?? { date: focusDate, startHour: null };
    setFocusDate(startOfLocalDay(nextSlot.date));
    setDraftSlot(nextSlot);
    setDialogKey((key) => key + 1);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={view}
              onValueChange={(value) => {
                if (value === 'list' || value === 'calendar') setView(value);
              }}
              className="w-full gap-0 sm:w-auto"
            >
              <TabsList className="grid h-12 w-full grid-cols-2 p-1 sm:w-[340px]">
                <TabsTrigger
                  value="list"
                  className="h-10 gap-2 rounded-lg px-4 text-sm font-semibold data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  <List className="size-4" />
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="h-10 gap-2 rounded-lg px-4 text-sm font-semibold data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  <CalendarDays className="size-4" />
                  Kalendarz
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button type="button" className="shrink-0" onClick={() => openCreateDialog()}>
              <Plus className="size-4" />
              Nowe wydarzenie
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex max-w-full flex-wrap gap-1.5">
              {KIND_FILTERS.map((filter) => {
                const isSelected = kind === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(
                      'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
                      isSelected
                        ? KIND_FILTER_SELECTED_CLASS[filter.id]
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                    )}
                    onClick={() => setKind(filter.id)}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            {entities.length > 1 ? (
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger
                  size="sm"
                  className="w-full bg-background sm:w-[260px]"
                  aria-label="Nieruchomość"
                >
                  <SelectValue placeholder="Nieruchomość" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Wszystkie nieruchomości ({entities.length})
                  </SelectItem>
                  {entities.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>

        {view === 'calendar' ? (
          <div className="flex flex-col gap-3 border-t border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                <button
                  type="button"
                  aria-label="Poprzedni zakres"
                  className="flex size-9 items-center justify-center text-foreground transition-colors hover:bg-muted"
                  onClick={goPrev}
                >
                  <ChevronLeft className="size-4.5" strokeWidth={2.25} />
                </button>
                <span className="w-px self-stretch bg-border" aria-hidden />
                <button
                  type="button"
                  aria-label="Następny zakres"
                  className="flex size-9 items-center justify-center text-foreground transition-colors hover:bg-muted"
                  onClick={goNext}
                >
                  <ChevronRight className="size-4.5" strokeWidth={2.25} />
                </button>
              </div>
              <p className="min-w-40 text-sm font-semibold tracking-tight">{calendarTitle}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 border-border bg-background px-3.5 font-semibold shadow-sm"
                onClick={goToday}
              >
                Dziś
              </Button>
            </div>
            <Tabs
              value={range}
              onValueChange={(value) => {
                if (value === 'day' || value === 'week' || value === 'month') {
                  setRange(value);
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="day">Dzień</TabsTrigger>
                <TabsTrigger value="week">Tydzień</TabsTrigger>
                <TabsTrigger value="month">Miesiąc</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        ) : null}
      </div>

      {view === 'list' ? (
        events.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 py-12 text-center">
              <p className="text-muted-foreground">
                Brak terminów. Uzupełnij daty ostatnich przeglądów w nieruchomościach albo dodaj
                własne wydarzenie.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href={KONTO_NIERUCHOMOSCI_HREF}>Przejdź do Nieruchomości</Link>
                </Button>
                <Button type="button" variant="outline" onClick={() => openCreateDialog()}>
                  Nowe wydarzenie
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Brak terminów dla wybranych filtrów.
            </CardContent>
          </Card>
        ) : (
          <ManagerKalendarzListView events={visible} />
        )
      ) : range === 'day' ? (
        <ManagerKalendarzDayView
          events={visible}
          day={focusDate}
          onCreateSlot={openCreateDialog}
          onSelectEvent={setPreviewEvent}
        />
      ) : range === 'week' ? (
        <ManagerKalendarzWeekView
          events={visible}
          weekStart={focusDate}
          onCreateSlot={openCreateDialog}
          onSelectEvent={setPreviewEvent}
        />
      ) : (
        <ManagerKalendarzMonthView
          events={visible}
          monthDate={focusDate}
          onCreateSlot={openCreateDialog}
          onSelectEvent={setPreviewEvent}
        />
      )}

      <ManagerKalendarzEventPreviewDialog
        event={previewEvent}
        open={previewEvent !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewEvent(null);
        }}
      />

      <ManagerKalendarzNewEventDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDraftSlot(null);
        }}
        defaultDate={draftSlot?.date ?? focusDate}
        defaultHour={draftSlot?.startHour ?? null}
        entities={entities}
      />
    </div>
  );
}
