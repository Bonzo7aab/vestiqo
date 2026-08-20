'use client';

import { useState } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
import { Shield } from 'lucide-react';
import { submitPilotApplication } from '../../app/program-pilotazowy/actions';
import {
  PILOT_APPLICATION_ANCHOR,
  pilotProgramContent,
  pilotRoleOptions,
  type PilotRole,
} from '../../lib/content/program-pilotazowy';
import { routes } from '../../lib/routes';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { cn } from '../ui/utils';

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    {' '}
    *
  </span>
);

export function PilotJoinCta({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={className}>
      <a
        href={`#${PILOT_APPLICATION_ANCHOR}`}
        onClick={() => {
          posthog.capture('landing_klik_pilotaz');
        }}
      >
        {pilotProgramContent.ctaLabel}
      </a>
    </Button>
  );
}

export function PilotApplicationForm({ className }: { className?: string }) {
  const [role, setRole] = useState<PilotRole>('manager');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isFormComplete =
    name.trim() !== '' && email.trim() !== '' && consent;

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-8 text-center">
        <p className="text-lg font-medium text-brand-navy">
          {pilotProgramContent.formSuccessMessage}
        </p>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!consent) {
      setError('Wyraź zgodę na przetwarzanie danych osobowych.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set('role', role);

    setIsSubmitting(true);
    const result = await submitPilotApplication(formData);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      return;
    }

    setError(result.error ?? 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pilot-role">
            Jestem
            <RequiredMark />
          </Label>
          <Select value={role} onValueChange={(value) => setRole(value as PilotRole)}>
            <SelectTrigger id="pilot-role">
              <SelectValue placeholder="Wybierz rolę" />
            </SelectTrigger>
            <SelectContent>
              {pilotRoleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pilot-name">
            Imię i nazwisko
            <RequiredMark />
          </Label>
          <Input
            id="pilot-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pilot-email">
            Adres e-mail
            <RequiredMark />
          </Label>
          <Input
            id="pilot-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pilot-phone">Numer telefonu</Label>
          <Input
            id="pilot-phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pilot-note">Dodatkowa notatka</Label>
          <Textarea
            id="pilot-note"
            name="note"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Np. liczba budynków, region lub branża"
          />
        </div>

        <label
          htmlFor="pilot-consent"
          className={cn(
            'flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors sm:gap-4 sm:p-5',
            consent
              ? 'border-primary/35 bg-primary/5 shadow-sm'
              : 'border-border/70 bg-muted/20 hover:border-border hover:bg-muted/35',
          )}
        >
          <Checkbox
            id="pilot-consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
            required
            className="mt-1 shrink-0"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Shield className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="text-sm font-semibold text-brand-navy">
                Zgoda na przetwarzanie danych
                <RequiredMark />
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zgłoszenia do
              programu pilotażowego.{' '}
              <Link
                href={routes.politykaPrywatnosci}
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                Polityka Prywatności
              </Link>
              .
            </p>
          </div>
        </label>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          disabled={isSubmitting || !isFormComplete}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Wysyłanie…' : 'Wyślij zgłoszenie'}
        </Button>
      </div>
    </form>
  );
}
