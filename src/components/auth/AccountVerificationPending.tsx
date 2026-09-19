'use client';

import { useState, useTransition } from 'react';
import { Mail, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import {
  AuthFormPanel,
  AuthPageLayout,
} from './AuthPageLayout';
import { logoutAction, resendManagerEmailVerificationAction } from '../../lib/auth/actions';
import type { VerificationStatus } from '../../lib/verification/types';

interface AccountVerificationPendingProps {
  email: string;
  emailVerified: boolean;
  verification: VerificationStatus;
  message?: string | null;
  error?: string | null;
}

export function AccountVerificationPending({
  email,
  emailVerified,
  verification,
  message,
  error,
}: AccountVerificationPendingProps) {
  const [isPending, startTransition] = useTransition();
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  const isRejected = verification.state === 'rejected';

  const handleResend = () => {
    setResendState('idle');
    setResendError(null);
    startTransition(async () => {
      const result = await resendManagerEmailVerificationAction();
      if (result && 'error' in result) {
        setResendState('error');
        setResendError(result.error);
        return;
      }
      setResendState('sent');
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <AuthPageLayout
      testId="account-verification-pending"
      headingTestId="account-verification-heading"
      title="Konto w trakcie weryfikacji"
      subtitle="Możesz się logować, ale pełny dostęp pojawi się po potwierdzeniu email i akceptacji administratora."
      trustNote="Dane chronione zgodnie z RODO. Weryfikacja kont wspólnot i spółdzielni przez zespół Vestiqo."
      side={{
        heading: 'Dwa kroki do publikacji konkursów',
        body: 'Najpierw potwierdź adres email, potem poczekaj na weryfikację administratora. Powiadomimy Cię, gdy konto będzie gotowe.',
        features: [
          {
            icon: Mail,
            title: 'Potwierdzenie email',
            description: 'Kliknij link wysłany na adres użyty przy rejestracji.',
          },
          {
            icon: ShieldCheck,
            title: 'Weryfikacja administratora',
            description: 'Sprawdzamy dane firmy z rejestru i akceptujemy konto.',
          },
          {
            icon: Clock,
            title: 'Czekaj na decyzję',
            description: 'Do tego czasu panel zarządcy pozostaje niedostępny.',
          },
        ],
      }}
    >
      {error ? (
        <Alert className="mb-4 border-destructive/30 bg-destructive/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <AuthFormPanel className="space-y-5">
        {isRejected ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Weryfikacja została odrzucona</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {verification.reason ??
                'Konto nie zostało zaakceptowane. Skontaktuj się z nami, jeśli chcesz poprawić dane i spróbować ponownie.'}
            </p>
          </div>
        ) : (
          <ol className="space-y-4">
            <li className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  emailVerified
                    ? 'bg-emerald-500/15 text-emerald-700'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                1
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {emailVerified ? 'Adres email potwierdzony' : 'Potwierdź adres email'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {emailVerified
                    ? 'Dziękujemy. Czekamy teraz na decyzję administratora.'
                    : `Wysłaliśmy link na ${email}. Sprawdź skrzynkę i folder spam.`}
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  emailVerified ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Weryfikacja administratora</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Po potwierdzeniu email konto trafia do kolejki. Administrator sprawdzi dane firmy i zaakceptuje konto.
                </p>
              </div>
            </li>
          </ol>
        )}

        {resendState === 'sent' ? (
          <p className="text-sm text-emerald-700">Wiadomość została wysłana ponownie.</p>
        ) : null}
        {resendError ? <p className="text-sm text-destructive">{resendError}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {!emailVerified && !isRejected ? (
            <Button type="button" onClick={handleResend} disabled={isPending}>
              {isPending ? 'Wysyłanie…' : 'Wyślij email ponownie'}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={handleLogout} disabled={isPending}>
            Wyloguj się
          </Button>
        </div>
      </AuthFormPanel>
    </AuthPageLayout>
  );
}
