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
import { startAccountRecoveryByNipAction } from '../lib/auth/nip-recovery-actions';
import { CommunityAccountClaimForm } from './CommunityAccountClaimPage';
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

type RecoveryStep =
  | { kind: 'nip' }
  | { kind: 'community_claim'; nip: string; claimPurpose: 'community_login' | 'email_recovery' }
  | { kind: 'email_sent'; nip: string; maskedEmail: string };

export function ForgotPasswordPage() {
  const [nip, setNip] = useState('');
  const [step, setStep] = useState<RecoveryStep>({ kind: 'nip' });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await startAccountRecoveryByNipAction(nip);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      if (result.kind === 'not_found') {
        setError('Nie znaleziono konta dla tego NIP.');
        return;
      }
      if (result.kind === 'community_claim') {
        setStep({ kind: 'community_claim', nip, claimPurpose: 'community_login' });
        return;
      }
      setStep({ kind: 'email_sent', nip, maskedEmail: result.maskedEmail });
    });
  };

  const footer = (
    <>
      Pamiętasz hasło?{' '}
      <Link href="/logowanie" className="font-medium text-primary hover:underline">
        Zaloguj się
      </Link>
    </>
  );

  if (step.kind === 'community_claim') {
    return (
      <AuthPageLayout
        testId="forgot-password-page"
        title="Odzyskaj konto"
        subtitle="Dołącz uchwałę z podpisem cyfrowym. Administrator rozpatrzy wniosek w ciągu 48 godzin."
        trustNote="Dane chronione zgodnie z RODO."
        contentMaxWidth="lg"
        side={authSide}
        footer={footer}
      >
        <CommunityAccountClaimForm
          initialNip={step.nip}
          lockNip
          claimPurpose={step.claimPurpose}
          embedded
        />
      </AuthPageLayout>
    );
  }

  if (step.kind === 'email_sent') {
    return (
      <AuthPageLayout
        testId="forgot-password-page"
        title="Email wysłany!"
        subtitle={`Nowe, tymczasowe hasło wyślemy na adres ${step.maskedEmail}.`}
        trustNote="Dane chronione zgodnie z RODO."
        side={authSide}
        footer={footer}
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
              Nowe hasło zostało wysłane na adres: <strong>{step.maskedEmail}</strong>
            </AlertDescription>
          </Alert>

          <div className="mb-6 space-y-2 text-sm text-muted-foreground">
            <p>Jeśli nie widzisz wiadomości:</p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>Sprawdź folder spam/junk</li>
              <li>Zaloguj się nowym hasłem i zmień je w ustawieniach konta</li>
              <li>Spróbuj ponownie za kilka minut</li>
            </ul>
          </div>

          <Button asChild className="mb-4 h-11 w-full">
            <Link href="/logowanie">
              Powrót do logowania
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              data-testid="no-email-access"
              onClick={() =>
                setStep({
                  kind: 'community_claim',
                  nip: step.nip,
                  claimPurpose: 'email_recovery',
                })
              }
            >
              Nie mam dostępu do tego emaila
            </button>
          </p>
        </AuthFormPanel>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      testId="forgot-password-page"
      title="Odzyskaj konto"
      subtitle="Podaj NIP powiązany z kontem."
      trustNote="Dane chronione zgodnie z RODO."
      side={authSide}
      footer={footer}
    >
      <AuthFormPanel>
        {error && (
          <Alert
            variant="destructive"
            className="mb-5 border-destructive bg-destructive/15 shadow-sm"
            data-testid="forgot-password-error"
          >
            <CircleAlert className="h-5 w-5" />
            <AlertTitle className="text-destructive">Nie udało się odzyskać konta</AlertTitle>
            <AlertDescription className="text-sm font-medium text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="nip">NIP</Label>
            <Input
              id="nip"
              name="nip"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="0000000000"
              className={authFieldClassName}
              required
              inputMode="numeric"
              autoComplete="off"
              disabled={isPending}
              data-testid="recovery-nip"
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={isPending} data-testid="recover-account">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sprawdzanie...
              </>
            ) : (
              <>
                Odzyskaj konto
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
