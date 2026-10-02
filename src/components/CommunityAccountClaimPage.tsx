'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle,
  CircleAlert,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessagesSquare,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AuthFieldError } from './auth/AuthFieldError';
import {
  AuthFormPanel,
  AuthPageLayout,
  authFieldClassName,
} from './auth/AuthPageLayout';
import { useGusNipLookup } from '../lib/gus/use-gus-nip-lookup';
import { submitCommunityAccountClaimAction } from '../lib/community-claims/actions';
import { COMMUNITY_CLAIM_HOLDING_COPY } from '../lib/community-claims/constants';

const authSide = {
  heading: 'Niezależne konto wspólnoty',
  body: 'Jeśli zarządca założył wspólnotę w swoim profilu, możesz odzyskać własne logowanie na podstawie uchwały z podpisem cyfrowym.',
  features: [
    {
      icon: FileText,
      title: 'Uchwała z podpisem',
      description: 'Dołącz PDF uchwały podpisanej kwalifikowanym podpisem elektronicznym.',
    },
    {
      icon: ClipboardList,
      title: 'Decyzja w 48 godzin',
      description: 'Administrator sprawdzi dokumenty i utworzy konto Zarządu Wspólnoty.',
    },
    {
      icon: MessagesSquare,
      title: 'Konto zarządcy bez zmian',
      description: 'Logowanie zarządcy pozostaje. Ta wspólnota znika z nowych konkursów.',
    },
  ],
};

export function CommunityAccountClaimPage() {
  const [nip, setNip] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [gusName, setGusName] = useState<string | null>(null);
  const [gusLocation, setGusLocation] = useState<string | null>(null);

  const gusLookup = useGusNipLookup({
    enabled: true,
    nip,
    onApply: (data) => {
      setGusName(data.name);
      setGusLocation([data.postalCode, data.city].filter(Boolean).join(' ') || null);
    },
    onClearDerived: () => {
      setGusName(null);
      setGusLocation(null);
    },
    trigger: 'blur',
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await submitCommunityAccountClaimAction(formData);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  };

  if (success) {
    return (
      <AuthPageLayout
        testId="community-claim-success"
        title="Wniosek złożony"
        subtitle={COMMUNITY_CLAIM_HOLDING_COPY}
        trustNote="Dane chronione zgodnie z RODO."
        side={authSide}
        footer={
          <>
            Masz już konto?{' '}
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
              Decyzja przyjdzie na adres <strong>{email}</strong> w ciągu 48 godzin.
            </AlertDescription>
          </Alert>
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

  const lookupError =
    gusLookup.validationError ?? (gusLookup.status === 'error' ? gusLookup.message : null);

  return (
    <AuthPageLayout
      testId="community-claim-page"
      title="Odzyskanie konta wspólnoty"
      subtitle="Dla wspólnot, które zarządca dodał do swojego profilu i które nie mają własnego loginu."
      trustNote="Dane chronione zgodnie z RODO."
      contentMaxWidth="lg"
      side={authSide}
      footer={
        <>
          Masz już konto?{' '}
          <Link href="/zapomniane-haslo" className="font-medium text-primary hover:underline">
            Reset hasła e-mailem
          </Link>
        </>
      }
    >
      <AuthFormPanel>
        {error && (
          <Alert
            variant="destructive"
            className="mb-5 border-destructive bg-destructive/15 shadow-sm"
            data-testid="community-claim-error"
          >
            <CircleAlert className="h-5 w-5" />
            <AlertTitle className="text-destructive">Nie udało się złożyć wniosku</AlertTitle>
            <AlertDescription className="text-sm font-medium text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="nip">NIP wspólnoty</Label>
            <Input
              id="nip"
              name="nip"
              value={nip}
              onChange={(e) => gusLookup.handleNipChange(e.target.value, setNip)}
              onBlur={gusLookup.handleNipBlur}
              placeholder="0000000000"
              className={authFieldClassName}
              required
              inputMode="numeric"
              autoComplete="off"
              disabled={isPending}
            />
            {lookupError ? (
              <AuthFieldError
                message={lookupError}
                reserveSpace={false}
                className="min-h-5 border-0 bg-transparent p-0"
              />
            ) : null}
            {gusLookup.status === 'loading' ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Pobieranie danych z GUS…
              </p>
            ) : null}
            {gusLookup.status === 'success' && gusName ? (
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium" data-testid="community-claim-gus-name">
                    {gusName}
                  </p>
                  {gusLocation ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {gusLocation}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={authFieldClassName}
                required
                disabled={isPending}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={authFieldClassName}
                required
                disabled={isPending}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email do logowania</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClassName}
              required
              disabled={isPending}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={authFieldClassName}
              required
              disabled={isPending}
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution">Uchwała PDF (podpis cyfrowy)</Label>
            <Input
              id="resolution"
              name="resolution"
              type="file"
              accept="application/pdf,.pdf"
              className={authFieldClassName}
              required
              disabled={isPending}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Tylko PDF, maksymalnie 10 MB. Administrator sprawdzi kwalifikowany podpis (PAdES).
            </p>
            {fileName ? <p className="text-xs text-foreground">{fileName}</p> : null}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={isPending} data-testid="community-claim-submit">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Wysyłanie...
              </>
            ) : (
              <>
                Złóż wniosek
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </AuthFormPanel>
    </AuthPageLayout>
  );
}
