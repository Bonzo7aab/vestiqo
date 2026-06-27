'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import {
  Building,
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CircleAlert,
  ClipboardList,
  FileCheck,
  UserCircle,
  Megaphone,
  MessagesSquare,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { registerAction } from '../lib/auth/actions';
import { translateRegistrationErrorMessage } from '../lib/auth/errorMessages';
import { lookupCompanyByNipAction } from '../lib/gus/actions';
import { isValidNip, normalizeNip } from '../lib/gus/nip';
import {
  formatPolishPhoneDisplay,
  isValidPolishPhone,
  normalizePolishPhone,
  POLISH_PHONE_INVALID_MESSAGE,
} from '../lib/phone/polish-phone';
import { isValidEmail, INVALID_EMAIL_MESSAGE } from '../lib/email/validate-email';
import { useUserProfile } from '../contexts/AuthContext';
import {
  registrationClosedMessage,
  type RegistrationSettings,
} from '../lib/registration-settings-shared';
import {
  AuthFormPanel,
  AuthFormSection,
  AuthPageLayout,
  authFieldClassName,
} from './auth/AuthPageLayout';
import { AuthFieldError } from './auth/AuthFieldError';
import { cn } from './ui/utils';

interface RegisterPageProps {
  registrationSettings: RegistrationSettings;
}

const MANAGER_ORGANIZATION_TYPE = 'wspólnota' as const;

function RoleOption({
  id,
  checked,
  disabled,
  onSelect,
  icon: Icon,
  label,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
  icon: typeof Building;
  label: string;
}) {
  return (
    <div className="relative">
      <input
        type="radio"
        id={id}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="peer sr-only"
      />
      <Label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-xl border-2 border-border/60 bg-background p-4 transition-all',
          'hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </span>
        <span className="font-medium text-foreground">{label}</span>
      </Label>
    </div>
  );
}

const PASSWORD_MISMATCH_MESSAGE = 'Hasła nie są identyczne';

export function RegisterPage({ registrationSettings }: RegisterPageProps) {
  const router = useRouter();
  const { refreshSession } = useUserProfile();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const urlError = searchParams?.get('error');
  const error =
    formError ||
    (urlError ? translateRegistrationErrorMessage(urlError) : undefined);
  const message = searchParams?.get('message') || undefined;
  const defaultUserTypeParam = searchParams?.get('userType') as 'contractor' | 'manager' | null;

  const resolvedDefaultType: 'contractor' | 'manager' = (() => {
    if (defaultUserTypeParam === 'manager' && registrationSettings.managerOpen) return 'manager';
    if (defaultUserTypeParam === 'contractor' && registrationSettings.contractorOpen) return 'contractor';
    if (registrationSettings.contractorOpen) return 'contractor';
    if (registrationSettings.managerOpen) return 'manager';
    return 'contractor';
  })();

  const [selectedUserType, setSelectedUserType] = useState<'contractor' | 'manager'>(resolvedDefaultType);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nip, setNip] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [regon, setRegon] = useState('');
  const [gusAddress, setGusAddress] = useState('');
  const [gusCity, setGusCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [bankAccountIban, setBankAccountIban] = useState('');
  const [vatStatus, setVatStatus] = useState('');
  const [gusLookupStatus, setGusLookupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gusLookupMessage, setGusLookupMessage] = useState<string | null>(null);
  const lastLookedUpNipRef = useRef<string | null>(null);
  const gusLookupAbortRef = useRef(0);

  const clearGusDerivedFields = useCallback(() => {
    setRegon('');
    setGusAddress('');
    setGusCity('');
    setPostalCode('');
    setBankAccountIban('');
    setVatStatus('');
    setCompanyName('');
    lastLookedUpNipRef.current = null;
  }, []);

  const runGusLookup = useCallback(async (nipValue: string) => {
    const normalized = normalizeNip(nipValue);

    if (!isValidNip(normalized)) {
      setGusLookupStatus('error');
      setGusLookupMessage('Nieprawidłowy numer NIP');
      return;
    }

    if (lastLookedUpNipRef.current === normalized) {
      return;
    }

    const requestId = ++gusLookupAbortRef.current;
    setGusLookupStatus('loading');
    setGusLookupMessage(null);

    const result = await lookupCompanyByNipAction(normalized);

    if (requestId !== gusLookupAbortRef.current) {
      return;
    }

    if ('error' in result) {
      setGusLookupStatus('error');
      setGusLookupMessage(result.error);
      clearGusDerivedFields();
      return;
    }

    lastLookedUpNipRef.current = normalized;
    setCompanyName(result.data.name);
    setRegon(result.data.regon);
    setGusAddress(result.data.address ?? '');
    setGusCity(result.data.city ?? '');
    setPostalCode(result.data.postalCode ?? '');
    setBankAccountIban(result.data.bankAccountIban ?? '');
    setVatStatus(result.data.vatStatus ?? '');
    setGusLookupStatus('success');
    setGusLookupMessage(null);
  }, [clearGusDerivedFields]);

  const handleSelectUserType = (type: 'contractor' | 'manager') => {
    setSelectedUserType(type);
  };

  const normalizedNip = normalizeNip(nip);
  const gusNipValidationError =
    normalizedNip.length >= 10 && !isValidNip(normalizedNip) ? 'Nieprawidłowy numer NIP' : null;

  const phoneError = (() => {
    if (!phoneTouched) {
      return null;
    }
    if (!phone.trim()) {
      return 'Telefon jest wymagany';
    }
    if (!isValidPolishPhone(phone)) {
      return POLISH_PHONE_INVALID_MESSAGE;
    }
    return null;
  })();

  const emailError = (() => {
    if (!emailTouched) {
      return null;
    }
    if (!email.trim()) {
      return 'Email jest wymagany';
    }
    if (!isValidEmail(email)) {
      return INVALID_EMAIL_MESSAGE;
    }
    return null;
  })();

  const passwordMismatchError = (() => {
    if (!confirmPasswordTouched) {
      return null;
    }
    if (!confirmPassword.trim()) {
      return null;
    }
    if (password !== confirmPassword) {
      return PASSWORD_MISMATCH_MESSAGE;
    }
    return null;
  })();

  const fieldErrorClass = 'border-destructive focus-visible:ring-destructive/30';

  useEffect(() => {
    if (!isValidNip(normalizedNip) || lastLookedUpNipRef.current === normalizedNip) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runGusLookup(normalizedNip);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedNip, runGusLookup]);

  const handleNipBlur = () => {
    const normalized = normalizeNip(nip);
    if (isValidNip(normalized) && lastLookedUpNipRef.current !== normalized) {
      void runGusLookup(normalized);
    }
  };

  const handleNipChange = (value: string) => {
    setNip(value);
    const normalized = normalizeNip(value);
    if (lastLookedUpNipRef.current && lastLookedUpNipRef.current !== normalized) {
      clearGusDerivedFields();
      setGusLookupStatus('idle');
      setGusLookupMessage(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (formError) {
      setFormError(null);
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (isValidPolishPhone(phone)) {
      setPhone(formatPolishPhoneDisplay(phone));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (formError) {
      setFormError(null);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (formError) {
      setFormError(null);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (formError) {
      setFormError(null);
    }
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordTouched(true);
  };

  const roleRegistrationClosed =
    (selectedUserType === 'contractor' && !registrationSettings.contractorOpen) ||
    (selectedUserType === 'manager' && !registrationSettings.managerOpen);

  const submitDisabled = !acceptTerms || roleRegistrationClosed;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (roleRegistrationClosed) {
      setFormError(registrationClosedMessage(selectedUserType));
      return;
    }

    if (!isValidNip(normalizedNip)) {
      setFormError('Podaj prawidłowy numer NIP');
      return;
    }

    if (!companyName.trim()) {
      setFormError('Wpisz NIP i poczekaj na pobranie nazwy firmy');
      return;
    }

    setPhoneTouched(true);
    setEmailTouched(true);
    setConfirmPasswordTouched(true);

    if (!isValidPolishPhone(phone)) {
      setFormError(POLISH_PHONE_INVALID_MESSAGE);
      return;
    }

    if (!isValidEmail(email)) {
      setFormError(INVALID_EMAIL_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setFormError(PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('phone', normalizePolishPhone(phone));
    formData.set('email', email.trim());
    formData.set('companyName', companyName.trim());
    formData.set('regon', regon.trim());
    formData.set('address', gusAddress.trim());
    formData.set('city', gusCity.trim());
    formData.set('postalCode', postalCode.trim());
    formData.set('bankAccountIban', bankAccountIban.trim());
    formData.set('vatStatus', vatStatus.trim());

    startTransition(async () => {
      const result = await registerAction(formData);

      if (result && 'error' in result) {
        setFormError(translateRegistrationErrorMessage(result.error));
        return;
      }

      if (result && 'success' in result && result.success) {
        posthog.capture('user_signed_up', { user_type: selectedUserType });
        await refreshSession();
        router.refresh();
        setTimeout(() => {
          router.push(result.redirectTo);
        }, 100);
      }
    });
  };

  const sideFeatures =
    selectedUserType === 'contractor'
      ? [
          {
            icon: ClipboardList,
            title: 'Przeglądaj konkursy i składaj oferty',
            description: 'Dopasuj ofertę do budżetu i terminu realizacji.',
          },
          {
            icon: FileCheck,
            title: 'Weryfikacja, kiedy chcesz',
            description: 'Dokumenty możesz przesłać od razu albo później z konta.',
          },
          {
            icon: UserCircle,
            title: 'Profil firmy w jednym miejscu',
            description: 'NIP, dane kontaktowe i kwalifikacje — uzupełnisz stopniowo.',
          },
        ]
      : [
          {
            icon: Megaphone,
            title: 'Publikuj konkursy dla wykonawców',
            description: 'Ogłoszenia widoczne na mapie i w liście konkursów.',
          },
          {
            icon: MessagesSquare,
            title: 'Bezpieczny kontakt z firmami',
            description: 'Komunikacja tylko z wybranymi wykonawcami.',
          },
          {
            icon: LayoutDashboard,
            title: 'Zarządzaj współpracą',
            description: 'Oferty, statusy i historia w panelu zarządcy.',
          },
        ];

  return (
    <AuthPageLayout
      testId="register-page"
      headingTestId="register-heading"
      contentMaxWidth="lg"
      showSideLogo={false}
      title="Zarejestruj się"
      subtitle="Kilka pól — i możesz korzystać z platformy."
      trustNote={
        selectedUserType === 'manager'
          ? 'Dane chronione zgodnie z RODO.'
          : 'Dane chronione zgodnie z RODO. Weryfikacja dokumentów dla wykonawców.'
      }
      side={{
        heading:
          selectedUserType === 'contractor'
            ? 'Dołącz jako wykonawca'
            : 'Dołącz jako zarządca',
        body:
          selectedUserType === 'contractor'
            ? 'Załóż konto firmy, a dokumenty weryfikacyjne prześlesz wtedy, kiedy będziesz gotowy.'
            : 'Opublikuj konkursy i znajdź sprawdzonych wykonawców w Warszawie.',
        features: sideFeatures,
      }}
      footer={
        <>
          Masz już konto?{' '}
          <Link href="/logowanie" className="font-medium text-primary hover:underline">
            Zaloguj się
          </Link>
        </>
      }
    >
      {error && (
        <Alert
          variant="destructive"
          className="mb-4 border-destructive bg-destructive/15 shadow-sm"
          data-testid="register-error"
        >
          <CircleAlert className="h-5 w-5" />
          <AlertTitle className="text-destructive">Nie udało się zarejestrować</AlertTitle>
          <AlertDescription className="text-sm font-medium text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}
      {message && (
        <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/5">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {!registrationSettings.contractorOpen && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{registrationClosedMessage('contractor')}</AlertDescription>
        </Alert>
      )}
      {!registrationSettings.managerOpen && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{registrationClosedMessage('manager')}</AlertDescription>
        </Alert>
      )}

      <AuthFormPanel>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" name="userType" value={selectedUserType} />

          <AuthFormSection title="Typ konta">
            <div className="grid grid-cols-2 gap-3">
              <RoleOption
                id="register-manager"
                checked={selectedUserType === 'manager'}
                disabled={!registrationSettings.managerOpen}
                onSelect={() => handleSelectUserType('manager')}
                icon={Building}
                label="Zarządca"
              />
              <RoleOption
                id="register-contractor"
                checked={selectedUserType === 'contractor'}
                disabled={!registrationSettings.contractorOpen}
                onSelect={() => handleSelectUserType('contractor')}
                icon={User}
                label="Wykonawca"
              />
            </div>
          </AuthFormSection>

          <AuthFormSection title="Firma">
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <div className="relative">
                <Input
                  id="nip"
                  name="nip"
                  value={nip}
                  onChange={e => handleNipChange(e.target.value)}
                  onBlur={handleNipBlur}
                  placeholder="0000000000"
                  className={authFieldClassName}
                  required
                  disabled={isPending}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>
              <div className="flex min-h-5 items-center gap-2">
                {gusLookupStatus === 'loading' && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                )}
                {gusNipValidationError || (gusLookupStatus === 'error' && gusLookupMessage) ? (
                  <AuthFieldError
                    message={gusNipValidationError ?? gusLookupMessage}
                    reserveSpace={false}
                    className="min-h-5 flex-1 border-0 bg-transparent p-0"
                  />
                ) : (
                  <p
                    className="min-h-5 text-sm leading-5 text-foreground"
                    data-testid="register-company-name"
                  >
                    {companyName || '\u00a0'}
                  </p>
                )}
              </div>
            </div>

            <input type="hidden" name="companyName" value={companyName} />
            <input type="hidden" name="regon" value={regon} />
            <input type="hidden" name="postalCode" value={postalCode} />
            <input type="hidden" name="address" value={gusAddress} />
            <input type="hidden" name="city" value={gusCity} />
            {selectedUserType === 'manager' && (
              <input type="hidden" name="organizationType" value={MANAGER_ORGANIZATION_TYPE} />
            )}
            <input type="hidden" name="bankAccountIban" value={bankAccountIban} />
            <input type="hidden" name="vatStatus" value={vatStatus} />
          </AuthFormSection>

          <AuthFormSection title="Osoba kontaktowa">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Imię</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Jan"
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
                  placeholder="Kowalski"
                  className={authFieldClassName}
                  required
                  disabled={isPending}
                  autoComplete="family-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onBlur={handlePhoneBlur}
                    placeholder="+48 512 345 678"
                    className={cn('pl-10', authFieldClassName, phoneError && fieldErrorClass)}
                    required
                    disabled={isPending}
                    autoComplete="tel"
                    inputMode="tel"
                    aria-invalid={phoneError ? true : undefined}
                    aria-describedby={phoneError ? 'phone-error' : undefined}
                  />
                </div>
                <AuthFieldError message={phoneError} id="phone-error" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => handleEmailChange(e.target.value)}
                    onBlur={handleEmailBlur}
                    placeholder="twoj@email.pl"
                    className={cn('pl-10', authFieldClassName, emailError && fieldErrorClass)}
                    required
                    disabled={isPending}
                    autoComplete="email"
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? 'email-error' : undefined}
                  />
                </div>
                <AuthFieldError message={emailError} id="email-error" />
              </div>
            </div>
          </AuthFormSection>

          <AuthFormSection title="Hasło">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Hasło</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => handlePasswordChange(e.target.value)}
                    placeholder="Co najmniej 6 znaków"
                    className={cn('pl-10 pr-10', authFieldClassName)}
                    required
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => handleConfirmPasswordChange(e.target.value)}
                    onBlur={handleConfirmPasswordBlur}
                    placeholder="Powtórz hasło"
                    className={cn(
                      'pl-10 pr-10',
                      authFieldClassName,
                      passwordMismatchError && fieldErrorClass,
                    )}
                    required
                    disabled={isPending}
                    autoComplete="new-password"
                    aria-invalid={passwordMismatchError ? true : undefined}
                    aria-describedby={passwordMismatchError ? 'confirm-password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <AuthFieldError message={passwordMismatchError} id="confirm-password-error" />
              </div>
            </div>
          </AuthFormSection>

          <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
            <Checkbox
              id="acceptTerms"
              checked={acceptTerms}
              onCheckedChange={v => setAcceptTerms(v === true)}
              disabled={isPending}
            />
            <label htmlFor="acceptTerms" className="cursor-pointer text-sm leading-snug text-muted-foreground">
              Akceptuję{' '}
              <Link
                href="/regulamin"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                regulamin
              </Link>{' '}
              i{' '}
              <Link
                href="/polityka-prywatnosci"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                politykę prywatności
              </Link>
              .
            </label>
          </div>
          <input type="hidden" name="acceptTerms" value={acceptTerms ? '1' : '0'} />

          <Button
            type="submit"
            disabled={submitDisabled || isPending}
            className="h-11 w-full"
            data-testid="register-submit"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejestracja...
              </>
            ) : (
              'Zarejestruj się'
            )}
          </Button>

          {selectedUserType === 'manager' ? (
            <p className="text-center text-xs text-muted-foreground">
              Twoje dane służą wyłącznie do kontaktu z wybranymi wykonawcami.
            </p>
          ) : null}
        </form>
      </AuthFormPanel>
    </AuthPageLayout>
  );
}

export default RegisterPage;
