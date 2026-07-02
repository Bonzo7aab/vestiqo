'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { broadcastSystemAnnouncementAction } from '../../app/administracja/actions';

export function AdminSystemAnnouncementForm() {
  const [kind, setKind] = useState<'legal' | 'maintenance'>('legal');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [isPending, startTransition] = useTransition();

  const sendAnnouncement = () => {
    startTransition(async () => {
      const result = await broadcastSystemAnnouncementAction({
        kind,
        effectiveDate,
        fromTime: kind === 'maintenance' ? fromTime : undefined,
        toTime: kind === 'maintenance' ? toTime : undefined,
      });

      if (result.ok) {
        toast.success(`Wysłano powiadomienie do ${result.sentCount ?? 0} użytkowników`);
      } else {
        toast.error(result.error ?? 'Nie udało się wysłać powiadomienia');
      }
    });
  };

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Powiadomienia systemowe</CardTitle>
        </div>
        <CardDescription>
          Wyślij krytyczne powiadomienie in-app do wszystkich użytkowników (bez przełącznika ON/OFF).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Typ komunikatu</p>
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select
              value={kind}
              onValueChange={(value: 'legal' | 'maintenance') => setKind(value)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legal">Aktualizacja regulaminu</SelectItem>
                <SelectItem value="maintenance">Przerwa techniczna</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Harmonogram</p>
          <div className="space-y-2">
            <Label htmlFor="announcement-date">Data</Label>
            <Input
              id="announcement-date"
              type="date"
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              disabled={isPending}
            />
          </div>

          {kind === 'maintenance' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="announcement-from">Od godziny</Label>
                <Input
                  id="announcement-from"
                  type="time"
                  value={fromTime}
                  onChange={(event) => setFromTime(event.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="announcement-to">Do godziny</Label>
                <Input
                  id="announcement-to"
                  type="time"
                  value={toTime}
                  onChange={(event) => setToTime(event.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wysyłka</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={isPending || !effectiveDate} className="w-full sm:w-auto">
                Wyślij powiadomienie
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Wysłać powiadomienie do wszystkich użytkowników?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta operacja wyśle powiadomienie in-app do każdego użytkownika na platformie. Nie można
                  jej cofnąć.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={sendAnnouncement} disabled={isPending}>
                  {isPending ? 'Wysyłanie...' : 'Potwierdź wysyłkę'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
