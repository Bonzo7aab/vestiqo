'use client';

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Users,
  Wrench,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
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
import { Alert, AlertDescription } from './ui/alert';
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
  ACCOUNT_ROLES,
  REGISTRATION_ENTITY_LABELS,
  REGISTRATION_ENTITY_TYPES,
  REGISTRATION_NIP_LABELS,
  REGISTRATION_ROLE_HEADINGS,
  SPOLDZIELNIA_SUB_ROLE_OPTIONS,
  SPOLDZIELNIA_SUB_ROLES,
  WSPOLNOTA_SUB_ROLE_OPTIONS,
  WSPOLNOTA_SUB_ROLES,
  registrationEntityToUserType,
  resolveRegistrationAccountRole,
  resolveRegistrationOrganizationType,
  type RegistrationEntityType,
  type SpoldzielniaSubRole,
  type WspolnotaSubRole,
} from '../lib/profile/account-role-labels';
import { AuthFormPanel, AuthPageLayout, authFieldClassName } from './auth/AuthPageLayout';
import { AuthFieldError } from './auth/AuthFieldError';
import { AuthFormError } from './auth/AuthFormError';
import { MIN_PASSWORD_LENGTH, validatePasswordStrength } from '../lib/auth/password-policy';
import { cn } from './ui/utils';

interface RegisterPageProps {
  registrationSettings: RegistrationSettings;
}

interface NipLookupState {
  nip: string;
  companyName: string;
  regon: string;
  address: string;
  city: string;
  postalCode: string;
  bankAccountIban: string;
  vatStatus: string;
  lookupStatus: 'idle' | 'loading' | 'success' | 'error';
  lookupMessage: string | null;
}

function createEmptyNipLookupState(): NipLookupState {
  return {
    nip: '',
    companyName: '',
    regon: '',
    address: '',
    city: '',
    postalCode: '',
    bankAccountIban: '',
    vatStatus: '',
    lookupStatus: 'idle',
    lookupMessage: null,
  };
}

function useNipLookup() {
  const [state, setState] = useState<NipLookupState>(createEmptyNipLookupState);
  const lastLookedUpNipRef = useRef<string | null>(null);
  const gusLookupAbortRef = useRef(0);

  const clearDerivedFields = useCallback(() => {
    setState(prev => ({
      ...prev,
      companyName: '',
      regon: '',
      address: '',
      city: '',
      postalCode: '',
      bankAccountIban: '',
      vatStatus: '',
    }));
    lastLookedUpNipRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setState(createEmptyNipLookupState());
    lastLookedUpNipRef.current = null;
    gusLookupAbortRef.current += 1;
  }, []);

  const runGusLookup = useCallback(
    async (nipValue: string) => {
      const normalized = normalizeNip(nipValue);

      if (!isValidNip(normalized)) {
        setState(prev => ({
          ...prev,
          lookupStatus: 'error',
          lookupMessage: 'Nieprawidłowy numer NIP',
        }));
        return;
      }

      if (lastLookedUpNipRef.current === normalized) {
        return;
      }

      const requestId = ++gusLookupAbortRef.current;
      setState(prev => ({ ...prev, lookupStatus: 'loading', lookupMessage: null }));

      const result = await lookupCompanyByNipAction(normalized);

      if (requestId !== gusLookupAbortRef.current) {
        return;
      }

      if ('error' in result) {
        setState(prev => ({
          ...prev,
          lookupStatus: 'error',
          lookupMessage: result.error,
          companyName: '',
          regon: '',
          address: '',
          city: '',
          postalCode: '',
          bankAccountIban: '',
          vatStatus: '',
        }));
        lastLookedUpNipRef.current = null;
        return;
      }

      lastLookedUpNipRef.current = normalized;
      setState(prev => ({
        ...prev,
        companyName: result.data.name,
        regon: result.data.regon,
        address: result.data.address ?? '',
        city: result.data.city ?? '',
        postalCode: result.data.postalCode ?? '',
        bankAccountIban: result.data.bankAccountIban ?? '',
        vatStatus: result.data.vatStatus ?? '',
        lookupStatus: 'success',
        lookupMessage: null,
      }));
    },
    [],
  );

  const setNip = useCallback(
    (value: string) => {
      const normalized = normalizeNip(value);
      setState(prev => {
        if (lastLookedUpNipRef.current && lastLookedUpNipRef.current !== normalized) {
          lastLookedUpNipRef.current = null;
          return {
            ...createEmptyNipLookupState(),
            nip: value,
          };
        }
        return { ...prev, nip: value };
      });
    },
    [],
  );

  const handleNipBlur = useCallback(() => {
    const normalized = normalizeNip(state.nip);
    if (isValidNip(normalized) && lastLookedUpNipRef.current !== normalized) {
      void runGusLookup(normalized);
    }
  }, [runGusLookup, state.nip]);

  const normalizedNip = normalizeNip(state.nip);
  const validationError =
    normalizedNip.length >= 10 && !isValidNip(normalizedNip) ? 'Nieprawidłowy numer NIP' : null;

  useEffect(() => {
    if (!isValidNip(normalizedNip) || lastLookedUpNipRef.current === normalizedNip) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runGusLookup(normalizedNip);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedNip, runGusLookup]);

  return {
    ...state,
    normalizedNip,
    validationError,
    setNip,
    handleNipBlur,
    reset,
    clearDerivedFields,
  };
}

function RegisterEntityTile({
  id,
  checked,
  disabled,
  onSelect,
  icon: Icon,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <div className="relative">
      <input
        type="radio"
        id={id}
        name="registrationEntityType"
        value={id.replace('register-', '')}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="peer sr-only"
      />
      <Label
        htmlFor={id}
        className={cn(
          'flex h-full cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 text-center shadow-sm transition-all sm:p-5',
          'hover:border-primary/50 hover:shadow-md peer-checked:border-primary peer-checked:bg-primary/8 peer-checked:shadow-md peer-checked:ring-2 peer-checked:ring-primary/20',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/15 peer-checked:bg-primary/15">
          <Icon className="h-6 w-6 text-primary" strokeWidth={2.25} />
        </span>
        <span className="space-y-1">
          <span className="block font-semibold text-foreground">{label}</span>
          <span className="block text-xs leading-snug text-muted-foreground">{description}</span>
        </span>
      </Label>
    </div>
  );
}

function RegisterRoleOption({
  id,
  name,
  value,
  checked,
  onSelect,
  label,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <div className="relative">
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <Label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-center rounded-xl border-2 border-border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-all',
          'hover:border-primary/50 hover:bg-muted/30 peer-checked:border-primary peer-checked:bg-primary/8 peer-checked:shadow-sm peer-checked:ring-2 peer-checked:ring-primary/15',
        )}
      >
        {label}
      </Label>
    </div>
  );
}

function NipLookupField({
  id,
  label,
  nip,
  companyName,
  lookupStatus,
  lookupMessage,
  validationError,
  companyNameTestId,
  disabled,
  onNipChange,
  onNipBlur,
}: {
  id: string;
  label: string;
  nip: string;
  companyName: string;
  lookupStatus: NipLookupState['lookupStatus'];
  lookupMessage: string | null;
  validationError: string | null;
  companyNameTestId?: string;
  disabled?: boolean;
  onNipChange: (value: string) => void;
  onNipBlur: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={nip}
        onChange={e => onNipChange(e.target.value)}
        onBlur={onNipBlur}
        placeholder="0000000000"
        className={authFieldClassName}
        required
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
      />
      <div className="flex min-h-5 items-center gap-2">
        {lookupStatus === 'loading' && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
        {validationError || (lookupStatus === 'error' && lookupMessage) ? (
          <AuthFieldError
            message={validationError ?? lookupMessage}
            reserveSpace={false}
            className="min-h-5 flex-1 border-0 bg-transparent p-0"
          />
        ) : (
          <p
            className="min-h-5 text-sm leading-5 text-foreground"
            data-testid={companyNameTestId}
          >
            {companyName || '\u00a0'}
          </p>
        )}
      </div>
    </div>
  );
}

const PASSWORD_MISMATCH_MESSAGE = 'Hasła nie są identyczne';

const ENTITY_TILE_DESCRIPTIONS: Record<RegistrationEntityType, string> = {
  [REGISTRATION_ENTITY_TYPES.WSPOLNOTA]: 'Zarząd wspólnoty lub powierzony zarządca',
  [REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]: 'Zarząd lub administracja spółdzielni',
  [REGISTRATION_ENTITY_TYPES.WYKONAWCA]: 'Firma wykonawcza szukająca zleceń',
};

function resolveDefaultEntityType(
  registrationSettings: RegistrationSettings,
  defaultUserTypeParam: 'contractor' | 'manager' | null,
): RegistrationEntityType {
  if (defaultUserTypeParam === 'manager' && registrationSettings.managerOpen) {
    return REGISTRATION_ENTITY_TYPES.WSPOLNOTA;
  }
  if (defaultUserTypeParam === 'contractor' && registrationSettings.contractorOpen) {
    return REGISTRATION_ENTITY_TYPES.WYKONAWCA;
  }
  if (registrationSettings.contractorOpen) {
    return REGISTRATION_ENTITY_TYPES.WYKONAWCA;
  }
  if (registrationSettings.managerOpen) {
    return REGISTRATION_ENTITY_TYPES.WSPOLNOTA;
  }
  return REGISTRATION_ENTITY_TYPES.WYKONAWCA;
}

export function RegisterPage({ registrationSettings }: RegisterPageProps) {
  const router = useRouter();
  const { refreshSession } = useUserProfile();
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(() => {
    const param = searchParams?.get('error');
    return param ? translateRegistrationErrorMessage(param) : null;
  });
  const message = searchParams?.get('message') || undefined;
  const defaultUserTypeParam = searchParams?.get('userType') as 'contractor' | 'manager' | null;

  useEffect(() => {
    if (!searchParams?.get('error')) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('error');
    const query = params.toString();
    router.replace(query ? `/rejestracja?${query}` : '/rejestracja', { scroll: false });
  }, [router, searchParams]);

  const [registrationEntityType, setRegistrationEntityType] = useState<RegistrationEntityType>(
    () => resolveDefaultEntityType(registrationSettings, defaultUserTypeParam),
  );
  const [wspolnotaSubRole, setWspolnotaSubRole] = useState<WspolnotaSubRole>(
    WSPOLNOTA_SUB_ROLES.CONDO_BOARD,
  );
  const [spoldzielniaSubRole, setSpoldzielniaSubRole] = useState<SpoldzielniaSubRole>(
    SPOLDZIELNIA_SUB_ROLES.COOPERATIVE_BOARD,
  );

  const entityNipLookup = useNipLookup();
  const managementNipLookup = useNipLookup();

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

  const selectedUserType = registrationEntityToUserType(registrationEntityType);
  const accountRole = resolveRegistrationAccountRole(
    registrationEntityType,
    registrationEntityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA
      ? wspolnotaSubRole
      : registrationEntityType === REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA
        ? spoldzielniaSubRole
        : null,
  );
  const isPropertyManager = accountRole === ACCOUNT_ROLES.PROPERTY_MANAGER;
  const organizationType = resolveRegistrationOrganizationType(registrationEntityType);

  const handleSelectEntityType = (entityType: RegistrationEntityType) => {
    setRegistrationEntityType(entityType);
    entityNipLookup.reset();
    managementNipLookup.reset();
    if (entityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA) {
      setWspolnotaSubRole(WSPOLNOTA_SUB_ROLES.CONDO_BOARD);
    }
    if (entityType === REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA) {
      setSpoldzielniaSubRole(SPOLDZIELNIA_SUB_ROLES.COOPERATIVE_BOARD);
    }
  };

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

    if (!isValidNip(entityNipLookup.normalizedNip)) {
      setFormError('Podaj prawidłowy numer NIP');
      return;
    }

    if (!entityNipLookup.companyName.trim()) {
      setFormError('Wpisz NIP i poczekaj na pobranie nazwy firmy');
      return;
    }

    if (isPropertyManager) {
      if (!isValidNip(managementNipLookup.normalizedNip)) {
        setFormError('Podaj prawidłowy NIP firmy zarządzającej');
        return;
      }
      if (!managementNipLookup.companyName.trim()) {
        setFormError('Wpisz NIP firmy zarządzającej i poczekaj na pobranie nazwy');
        return;
      }
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

    const passwordCheck = validatePasswordStrength(password);
    if (!passwordCheck.valid) {
      setFormError(passwordCheck.message ?? 'Nieprawidłowe hasło');
      return;
    }

    if (password !== confirmPassword) {
      setFormError(PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set('phone', normalizePolishPhone(phone));
    formData.set('email', email.trim());
    formData.set('userType', selectedUserType);
    formData.set('registrationEntityType', registrationEntityType);
    formData.set('accountRole', accountRole);
    formData.set('wspolnotaSubRole', wspolnotaSubRole);
    formData.set('spoldzielniaSubRole', spoldzielniaSubRole);

    if (organizationType) {
      formData.set('organizationType', organizationType);
    }

    if (isPropertyManager) {
      formData.set('nip', managementNipLookup.nip.trim());
      formData.set('companyName', managementNipLookup.companyName.trim());
      formData.set('regon', managementNipLookup.regon.trim());
      formData.set('address', managementNipLookup.address.trim());
      formData.set('city', managementNipLookup.city.trim());
      formData.set('postalCode', managementNipLookup.postalCode.trim());
      formData.set('bankAccountIban', managementNipLookup.bankAccountIban.trim());
      formData.set('vatStatus', managementNipLookup.vatStatus.trim());
      formData.set('managedEntityNip', entityNipLookup.nip.trim());
      formData.set('managedEntityName', entityNipLookup.companyName.trim());
      formData.set('managedEntityRegon', entityNipLookup.regon.trim());
      formData.set('managedEntityAddress', entityNipLookup.address.trim());
      formData.set('managedEntityCity', entityNipLookup.city.trim());
      formData.set('managedEntityPostalCode', entityNipLookup.postalCode.trim());
      formData.set('managedEntityBankAccountIban', entityNipLookup.bankAccountIban.trim());
      formData.set('managedEntityVatStatus', entityNipLookup.vatStatus.trim());
    } else {
      formData.set('nip', entityNipLookup.nip.trim());
      formData.set('companyName', entityNipLookup.companyName.trim());
      formData.set('regon', entityNipLookup.regon.trim());
      formData.set('address', entityNipLookup.address.trim());
      formData.set('city', entityNipLookup.city.trim());
      formData.set('postalCode', entityNipLookup.postalCode.trim());
      formData.set('bankAccountIban', entityNipLookup.bankAccountIban.trim());
      formData.set('vatStatus', entityNipLookup.vatStatus.trim());
    }

    startTransition(async () => {
      const result = await registerAction(formData);

      if (result && 'error' in result) {
        setFormError(translateRegistrationErrorMessage(result.error));
        return;
      }

      if (result && 'success' in result && result.success) {
        posthog.capture('user_signed_up', {
          user_type: selectedUserType,
          account_role: accountRole,
        });
        await refreshSession();
        router.refresh();
        setTimeout(() => {
          router.push(result.redirectTo);
        }, 100);
      }
    });
  };

  const sideFeaturesByEntity: Record<RegistrationEntityType, Array<{
    icon: LucideIcon;
    title: string;
    description: string;
  }>> = {
    [REGISTRATION_ENTITY_TYPES.WYKONAWCA]: [
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
    ],
    [REGISTRATION_ENTITY_TYPES.WSPOLNOTA]: [
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
    ],
    [REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]: [
      {
        icon: Megaphone,
        title: 'Publikuj konkursy dla wykonawców',
        description: 'Transparentne postępowania dla mieszkańców spółdzielni.',
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
    ],
  };

  const sideCopyByEntity: Record<
    RegistrationEntityType,
    { heading: string; body: string; trustNote: string }
  > = {
    [REGISTRATION_ENTITY_TYPES.WYKONAWCA]: {
      heading: 'Dołącz jako wykonawca',
      body: 'Załóż konto firmy, a dokumenty weryfikacyjne prześlesz wtedy, kiedy będziesz gotowy.',
      trustNote: 'Dane chronione zgodnie z RODO. Weryfikacja dokumentów dla wykonawców.',
    },
    [REGISTRATION_ENTITY_TYPES.WSPOLNOTA]: {
      heading: 'Dołącz jako wspólnota',
      body: 'Opublikuj konkursy i znajdź sprawdzonych wykonawców w Twojej okolicy.',
      trustNote: 'Dane chronione zgodnie z RODO.',
    },
    [REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]: {
      heading: 'Dołącz jako spółdzielnia',
      body: 'Prowadź konkursy ofert w sposób przejrzysty i bezpieczny dla mieszkańców.',
      trustNote: 'Dane chronione zgodnie z RODO.',
    },
  };

  const sideCopy = sideCopyByEntity[registrationEntityType];
  const roleHeading = REGISTRATION_ROLE_HEADINGS[registrationEntityType];

  return (
    <AuthPageLayout
      testId="register-page"
      headingTestId="register-heading"
      contentMaxWidth="lg"
      showMobileLogo={false}
      title="Zarejestruj się"
      trustNote={sideCopy.trustNote}
      side={{
        heading: sideCopy.heading,
        body: sideCopy.body,
        features: sideFeaturesByEntity[registrationEntityType],
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
      {formError ? <AuthFormError message={formError} testId="register-error" /> : null}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RegisterEntityTile
              id="register-wspolnota"
              checked={registrationEntityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA}
              disabled={!registrationSettings.managerOpen}
              onSelect={() => handleSelectEntityType(REGISTRATION_ENTITY_TYPES.WSPOLNOTA)}
              icon={Building2}
              label={REGISTRATION_ENTITY_LABELS[REGISTRATION_ENTITY_TYPES.WSPOLNOTA]}
              description={ENTITY_TILE_DESCRIPTIONS[REGISTRATION_ENTITY_TYPES.WSPOLNOTA]}
            />
            <RegisterEntityTile
              id="register-spoldzielnia"
              checked={registrationEntityType === REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA}
              disabled={!registrationSettings.managerOpen}
              onSelect={() => handleSelectEntityType(REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA)}
              icon={Users}
              label={REGISTRATION_ENTITY_LABELS[REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]}
              description={ENTITY_TILE_DESCRIPTIONS[REGISTRATION_ENTITY_TYPES.SPOLDZIELNIA]}
            />
            <RegisterEntityTile
              id="register-wykonawca"
              checked={registrationEntityType === REGISTRATION_ENTITY_TYPES.WYKONAWCA}
              disabled={!registrationSettings.contractorOpen}
              onSelect={() => handleSelectEntityType(REGISTRATION_ENTITY_TYPES.WYKONAWCA)}
              icon={Wrench}
              label={REGISTRATION_ENTITY_LABELS[REGISTRATION_ENTITY_TYPES.WYKONAWCA]}
              description={ENTITY_TILE_DESCRIPTIONS[REGISTRATION_ENTITY_TYPES.WYKONAWCA]}
            />
          </div>

          <NipLookupField
            id="entityNip"
            label={REGISTRATION_NIP_LABELS[registrationEntityType]}
            nip={entityNipLookup.nip}
            companyName={entityNipLookup.companyName}
            lookupStatus={entityNipLookup.lookupStatus}
            lookupMessage={entityNipLookup.lookupMessage}
            validationError={entityNipLookup.validationError}
            companyNameTestId="register-company-name"
            disabled={isPending}
            onNipChange={entityNipLookup.setNip}
            onNipBlur={entityNipLookup.handleNipBlur}
          />

          {roleHeading ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{roleHeading}</p>
              <div className="grid gap-2">
                {registrationEntityType === REGISTRATION_ENTITY_TYPES.WSPOLNOTA
                  ? WSPOLNOTA_SUB_ROLE_OPTIONS.map(option => (
                      <RegisterRoleOption
                        key={option.value}
                        id={`wspolnota-role-${option.value}`}
                        name="wspolnotaSubRole"
                        value={option.value}
                        checked={wspolnotaSubRole === option.value}
                        onSelect={() => setWspolnotaSubRole(option.value)}
                        label={option.label}
                      />
                    ))
                  : SPOLDZIELNIA_SUB_ROLE_OPTIONS.map(option => (
                      <RegisterRoleOption
                        key={option.value}
                        id={`spoldzielnia-role-${option.value}`}
                        name="spoldzielniaSubRole"
                        value={option.value}
                        checked={spoldzielniaSubRole === option.value}
                        onSelect={() => setSpoldzielniaSubRole(option.value)}
                        label={option.label}
                      />
                    ))}
              </div>
            </div>
          ) : null}

          {isPropertyManager ? (
            <NipLookupField
              id="managementNip"
              label="NIP Firmy Zarządzającej"
              nip={managementNipLookup.nip}
              companyName={managementNipLookup.companyName}
              lookupStatus={managementNipLookup.lookupStatus}
              lookupMessage={managementNipLookup.lookupMessage}
              validationError={managementNipLookup.validationError}
              companyNameTestId="register-management-company-name"
              disabled={isPending}
              onNipChange={managementNipLookup.setNip}
              onNipBlur={managementNipLookup.handleNipBlur}
            />
          ) : null}

          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Dane osoby kontaktowej</p>
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
                <Label htmlFor="email">E-mail</Label>
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
          </div>

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
                    placeholder={`Co najmniej ${MIN_PASSWORD_LENGTH} znaków`}
                    className={cn('pl-10 pr-10', authFieldClassName)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
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
