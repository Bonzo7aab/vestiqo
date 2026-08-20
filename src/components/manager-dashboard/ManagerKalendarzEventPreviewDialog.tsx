'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import {
  CALENDAR_KIND_LABEL,
  type ManagerCalendarEvent,
} from '../../lib/calendar/manager-calendar-events';
import { formatHourLabel, formatPolishDate } from '../../lib/calendar/dates';
import { inspectionStatusLabel } from '../../types/managed-building';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { calendarKindChipClass } from './ManagerKalendarzEventChip';
import { cn } from '../ui/utils';

interface ManagerKalendarzEventPreviewDialogProps {
  event: ManagerCalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagerKalendarzEventPreviewDialog({
  event,
  open,
  onOpenChange,
}: ManagerKalendarzEventPreviewDialogProps): ReactElement {
  const hourLabel =
    event?.startHour != null ? formatHourLabel(event.startHour) : 'Cały dzień';
  const place = event
    ? event.buildingName
      ? `${event.entityName} · ${event.buildingName}`
      : event.entityName
    : '';
  const hasDetails = Boolean(event?.href && event.href !== event.ctaHref);
  const hasActions = Boolean((event?.ctaHref && event.ctaLabel) || hasDetails);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(focusEvent) => {
          focusEvent.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Wydarzenie</DialogTitle>
          <DialogDescription>
            {event ? CALENDAR_KIND_LABEL[event.kind] : 'Szczegóły terminu'}
          </DialogDescription>
        </DialogHeader>
        {event ? (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-lg border border-border border-l-2 px-3 py-2',
                calendarKindChipClass(event.kind),
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {CALENDAR_KIND_LABEL[event.kind]}
              </p>
              <p className="text-sm font-semibold leading-snug text-foreground">{event.title}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-event-title">Tytuł</Label>
              <Input id="calendar-event-title" value={event.title} readOnly tabIndex={-1} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calendar-event-date">Data</Label>
                <Input
                  id="calendar-event-date"
                  value={formatPolishDate(event.dueOn)}
                  readOnly
                  tabIndex={-1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-event-hour">Godzina</Label>
                <Input id="calendar-event-hour" value={hourLabel} readOnly tabIndex={-1} />
              </div>
            </div>
            {event.entityName && event.entityName !== '—' ? (
              <div className="space-y-2">
                <Label htmlFor="calendar-event-entity">Nieruchomość</Label>
                <Input
                  id="calendar-event-entity"
                  value={event.entityName}
                  readOnly
                  tabIndex={-1}
                />
              </div>
            ) : null}

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden />
                <span>{inspectionStatusLabel(event.status)}</span>
              </div>
              {place && place !== '—' ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span>{place}</span>
                </p>
              ) : null}
              {hasActions ? (
                <div className="flex flex-wrap gap-2">
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
              ) : null}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
