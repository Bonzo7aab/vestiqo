'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  CircleAlert,
  ClipboardList,
  Loader2,
  Mail,
  MapPin,
  MessagesSquare,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { requestPasswordResetEmailAction } from '../lib/auth/actions';
import { translateAuthErrorMessage } from '../lib/auth/errorMessages';
import {
  AuthFormPanel,
  AuthPageLayout,
  authFieldClassName,
} from './auth/AuthPageLayout';

const authSide = {
  heading: 'Konkursy usług dla nieruchomości',
  body: 'Jedna platforma dla zarządców publikujących konkursy i wykonawców składających oferty.',
  features: [
    {
      icon: MapPin,
      title: 'Konkursy na mapie',
      description: 'Przeglądaj ogłoszenia w wybranej lokalizacji i kategorii.',
    },
    {
      icon: MessagesSquare,
      title: 'Wiadomości i oferty',
      description: 'Komunikacja oraz status ofert w panelu konta.',
    },
    {
      icon: ClipboardList,
      title: 'Panel zarządcy lub wykonawcy',
      description: 'Zarządzaj konkursami, ofertami i współpracą w jednym miejscu.',
    },
  ],
};

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordResetEmailAction(email);
      if ('error' in result) {
        setError(translateAuthErrorMessage(result.error));
        return;
      }
      setSuccess(true);
    });
  };

  if (success) {
    return (
      <AuthPageLayout
        testId="forgot-password-page"
        title="Email wysłany!"
        subtitle="Jeśli konto o podanym adresie email istnieje, wyślemy link do ustawienia nowego hasła."
        sideVariant="simple"
        trustNote="Dane chronione zgodnie z RODO."
        side={authSide}
        footer={
          <>
            Pamiętasz hasło?{' '}
            <Link href="/logowanie" className="font-medium text-primary hover:underline">
              Zaloguj się
            </Link>
          </>
        }
      >
        <AuthFormPanel>
          <div className="mb-6 flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </span>
          </div>

          <Alert className="mb-5 border-emerald-500/30 bg-emerald-500/5">
            <Mail className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm">
              <strong>Sprawdź swoją skrzynkę email</strong>
              <br />
              Link do resetu hasła został wysłany na adres: <strong>{email}</strong>
            </AlertDescription>
          </Alert>

          <div className="mb-6 space-y-2 text-sm text-muted-foreground">
            <p>Jeśli nie widzisz wiadomości:</p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>Sprawdź folder spam/junk</li>
              <li>Upewnij się, że adres email jest prawidłowy</li>
              <li>Kliknij link w wiadomości i ustaw nowe hasło</li>
              <li>Spróbuj ponownie za kilka minut</li>
            </ul>
          </div>

          <Button asChild className="h-11 w-full">
            <Link href="/logowanie">
              Powrót do logowania
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </AuthFormPanel>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      testId="forgot-password-page"
      title="Zapomniałeś hasła?"
      subtitle="Podaj adres email powiązany z kontem — wyślemy link do ustawienia nowego hasła."
      sideVariant="simple"
      trustNote="Dane chronione zgodnie z RODO."
      side={authSide}
      footer={
        <>
          Pamiętasz hasło?{' '}
          <Link href="/logowanie" className="font-medium text-primary hover:underline">
            Zaloguj się
          </Link>
        </>
      }
    >
      <AuthFormPanel>
        {error && (
          <Alert
            variant="destructive"
            className="mb-5 border-destructive bg-destructive/15 shadow-sm"
            data-testid="forgot-password-error"
          >
            <CircleAlert className="h-5 w-5" />
            <AlertTitle className="text-destructive">Nie udało się wysłać linku</AlertTitle>
            <AlertDescription className="text-sm font-medium text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Adres email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className={`pl-10 ${authFieldClassName}`}
                required
                disabled={isPending}
                autoComplete="email"
              />
            </div>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wysyłanie...
              </>
            ) : (
              <>
                Wyślij link resetujący
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </AuthFormPanel>
    </AuthPageLayout>
  );
}

export default ForgotPasswordPage;
