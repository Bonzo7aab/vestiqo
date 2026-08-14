'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { calendarHourRows, formatHourLabel, toIsoDate } from '../../lib/calendar/dates';
import {
  CALENDAR_KIND_LABEL,
  CALENDAR_NOTE_KINDS,
  type ManagerCalendarEventKind,
} from '../../lib/calendar/manager-calendar-events';
import { createCalendarNoteAction } from '../../app/panel-zarzadcy/kalendarz/actions';
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
import { Textarea } from '../ui/textarea';

const HOURS = calendarHourRows();

interface ManagerKalendarzNewEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
  defaultHour?: number | null;
  entities: Array<[string, string]>;
}

export function ManagerKalendarzNewEventDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultHour = null,
  entities,
}: ManagerKalendarzNewEventDialogProps): ReactElement {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState(() => toIsoDate(defaultDate));
  const [startHour, setStartHour] = useState(() =>
    defaultHour == null ? '' : String(defaultHour),
  );
  const [notes, setNotes] = useState('');
  const [entityId, setEntityId] = useState('none');
  const [eventKind, setEventKind] = useState<ManagerCalendarEventKind>('custom');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error('Podaj tytuł wydarzenia.');
      return;
    }

    setPending(true);
    const result = await createCalendarNoteAction({
      title: trimmed,
      dueOn,
      startHour: startHour === '' ? null : Number.parseInt(startHour, 10),
      notes,
      managedEntityId: entityId === 'none' ? null : entityId,
      eventKind,
    });
    setPending(false);

    if (!result.success) {
      toast.error(result.error ?? 'Nie udało się dodać wydarzenia.');
      return;
    }

    toast.success('Wydarzenie dodane. Powiadomienie zostało wysłane.');
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowe wydarzenie</DialogTitle>
          <DialogDescription>
            Dodaj własne przypomnienie w kalendarzu. Powiadomienie pojawi się od razu w
            skrzynce.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(formEvent) => void handleSubmit(formEvent)}>
          <div className="space-y-2">
            <Label htmlFor="calendar-note-title">Tytuł</Label>
            <Input
              id="calendar-note-title"
              value={title}
              onChange={(changeEvent) => setTitle(changeEvent.target.value)}
              maxLength={200}
              required
              placeholder="Np. Spotkanie z zarządem"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calendar-note-kind">Typ wydarzenia</Label>
            <select
              id="calendar-note-kind"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={eventKind}
              onChange={(changeEvent) => {
                const nextKind = changeEvent.target.value;
                if (CALENDAR_NOTE_KINDS.includes(nextKind as ManagerCalendarEventKind)) {
                  setEventKind(nextKind as ManagerCalendarEventKind);
                }
              }}
            >
              {CALENDAR_NOTE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {CALENDAR_KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="calendar-note-date">Data</Label>
              <Input
                id="calendar-note-date"
                type="date"
                value={dueOn}
                onChange={(changeEvent) => setDueOn(changeEvent.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-note-hour">Godzina (opcjonalnie)</Label>
              <select
                id="calendar-note-hour"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={startHour}
                onChange={(changeEvent) => setStartHour(changeEvent.target.value)}
              >
                <option value="">Cały dzień</option>
                {HOURS.map((hour) => (
                  <option key={hour} value={String(hour)}>
                    {formatHourLabel(hour)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {entities.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="calendar-note-entity">Nieruchomość (opcjonalnie)</Label>
              <select
                id="calendar-note-entity"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={entityId}
                onChange={(changeEvent) => setEntityId(changeEvent.target.value)}
              >
                <option value="none">Bez nieruchomości</option>
                {entities.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="calendar-note-notes">Notatka</Label>
            <Textarea
              id="calendar-note-notes"
              value={notes}
              onChange={(changeEvent) => setNotes(changeEvent.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Szczegóły przypomnienia"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Zapisywanie…' : 'Dodaj wydarzenie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
