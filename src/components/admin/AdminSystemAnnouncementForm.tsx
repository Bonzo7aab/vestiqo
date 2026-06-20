'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
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
import { broadcastSystemAnnouncementAction } from '../../app/administracja/actions';

export function AdminSystemAnnouncementForm() {
  const [kind, setKind] = useState<'legal' | 'maintenance'>('legal');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Powiadomienia systemowe</CardTitle>
        <CardDescription>
          Wyślij krytyczne powiadomienie in-app do wszystkich użytkowników (bez przełącznika ON/OFF).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Typ komunikatu</Label>
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

        <Button type="button" onClick={handleSend} disabled={isPending || !effectiveDate}>
          Wyślij powiadomienie
        </Button>
      </CardContent>
    </Card>
  );
}
