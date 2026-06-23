'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowRight, MapPin, MessagesSquare, ClipboardList, CircleAlert } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { loginAction, resendConfirmationEmailAction } from '../lib/auth/actions';
import { translateAuthErrorMessage } from '../lib/auth/errorMessages';
import { useUserProfile } from '../contexts/AuthContext';
import { sanitizeRedirectPath } from '../lib/auth/redirectPath';
import {
  AuthFormPanel,
  AuthPageLayout,
  authFieldClassName,
} from './auth/AuthPageLayout';

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useUserProfile();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(() => {
    const param = searchParams?.get('error');
    return param ? translateAuthErrorMessage(param) : null;
  });
  const [message, setMessage] = useState<string | null>(searchParams?.get('message') ?? null);
  const [email, setEmail] = useState('');
  const [resendPending, setResendPending] = useState(false);

  const redirectTo = sanitizeRedirectPath(searchParams?.get('redirectTo'), '/');
  const showResendConfirmation =
    Boolean(error) &&
    error.includes('nie został potwierdzony');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);

      if ('error' in result) {
        setError(translateAuthErrorMessage(result.error));
      } else {
        await refreshSession();
        router.refresh();
        const target = result.redirectTo || redirectTo;
        setTimeout(() => {
          router.push(target);
        }, 100);
      }
    });
  };

  const handleResendConfirmation = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Podaj adres email, aby wysłać ponownie link potwierdzający.');
      return;
    }

    setResendPending(true);
    const result = await resendConfirmationEmailAction(trimmed);
    setResendPending(false);

    if ('error' in result) {
      setError(translateAuthErrorMessage(result.error));
      return;
    }

    setError(null);
    setMessage('Wysłaliśmy ponownie link potwierdzający. Sprawdź skrzynkę odbiorczą (również spam).');
  };

  return (
    <AuthPageLayout
      testId="login-page"
      title="Zaloguj się"
      subtitle="Wróć do konkursów i wiadomości na swoim koncie."
      sideVariant="simple"
      trustNote="Dane chronione zgodnie z RODO."
      side={{
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
      }}
      footer={
        <>
          Nie masz konta?{' '}
          <Link href="/rejestracja" className="font-medium text-primary hover:underline">
            Zarejestruj się
          </Link>
        </>
      }
    >
      {message && (
        <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <AuthFormPanel>
        {error && (
          <Alert
            variant="destructive"
            className="mb-5 border-destructive bg-destructive/15 shadow-sm"
            data-testid="login-error"
          >
            <CircleAlert className="h-5 w-5" />
            <AlertTitle className="text-destructive">Błąd logowania</AlertTitle>
            <AlertDescription className="space-y-3 text-sm font-medium text-destructive">
              <p>{error}</p>
              {showResendConfirmation ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 bg-background text-destructive hover:bg-destructive/10"
                  disabled={isPending || resendPending}
                  onClick={() => void handleResendConfirmation()}
                >
                  {resendPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wysyłanie…
                    </>
                  ) : (
                    'Wyślij ponownie link potwierdzający'
                  )}
                </Button>
              ) : null}
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
                onChange={e => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className={`pl-10 ${authFieldClassName}`}
                required
                disabled={isPending}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Hasło</Label>
              <Link
                href="/zapomniane-haslo"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Zapomniałeś hasła?
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className={`pl-10 ${authFieldClassName}`}
                required
                disabled={isPending}
                autoComplete="current-password"
              />
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />

          <Button type="submit" className="h-11 w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                Zaloguj się
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </AuthFormPanel>
    </AuthPageLayout>
  );
}

export default LoginPage;
