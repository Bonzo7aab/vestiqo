'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { routes } from '../../lib/routes';
import {
  contactRoleOptions,
  contactSuccessMessage,
  type ContactRole,
} from '../../lib/content/kontakt';
import { submitContactForm } from '../../app/kontakt/actions';

interface ContactFormProps {
  className?: string;
}

export function ContactForm({ className }: ContactFormProps) {
  const [role, setRole] = useState<ContactRole>('manager');
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-8 text-center">
        <p className="text-lg font-medium text-[hsl(var(--brand-navy))]">
          {contactSuccessMessage}
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
    const result = await submitContactForm(formData);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      return;
    }

    setError(result.error ?? 'Nie udało się wysłać wiadomości. Spróbuj ponownie.');
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role">Jestem</Label>
          <Select value={role} onValueChange={(value) => setRole(value as ContactRole)}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Wybierz rolę" />
            </SelectTrigger>
            <SelectContent>
              {contactRoleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Imię i nazwisko</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Numer telefonu (opcjonalnie)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Temat wiadomości</Label>
          <Input id="subject" name="subject" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Treść wiadomości</Label>
          <Textarea id="message" name="message" rows={6} required />
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
          />
          <Label htmlFor="consent" className="text-sm leading-relaxed font-normal">
            Wyrażam zgodę na przetwarzanie moich danych osobowych w celu obsługi zapytania.{' '}
            <Link href={routes.politykaPrywatnosci} className="text-primary hover:underline">
              Więcej w Polityce Prywatności
            </Link>
            .
          </Label>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? 'Wysyłanie…' : 'Wyślij wiadomość'}
        </Button>
      </div>
    </form>
  );
}
