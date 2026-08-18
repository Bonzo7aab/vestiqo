export const REGISTRATION_ERRORS = {
  emailAlreadyRegistered:
    'Konto z tym adresem email już istnieje. Zaloguj się lub użyj innego adresu.',
  /** Fallback when the conflicting NIP value is unknown. Prefer nipAlreadyRegisteredMessage(). */
  nipAlreadyRegistered:
    'Firma z tym numerem NIP jest już zarejestrowana na platformie. Jeśli to Twoja firma, zaloguj się na istniejące konto.',
  emailRateLimitExceeded:
    'Limit wysyłki maili potwierdzających projektu został osiągnięty — to nie oznacza, że Twoja skrzynka dostała dużo wiadomości. Spróbuj za godzinę albo napisz na kontakt@vestiqo.pl.',
  /** Kept for older clients; registration no longer blocks on duplicate-check outages. */
  duplicateCheckUnavailable:
    'Nie udało się zweryfikować danych rejestracji. Spróbuj ponownie za chwilę.',
  managementAndCommunityNipMustDiffer:
    'NIP wspólnoty i NIP administracji muszą być różne. W pierwszym polu podaj NIP wspólnoty mieszkaniowej, a w drugim — NIP firmy zarządzającej (Administracji Wspólnoty).',
} as const;

export type NipConflictRole = 'company' | 'management' | 'community';

/** OPD-167: name the exact NIP (and field) that blocks registration. */
export function nipAlreadyRegisteredMessage(
  nip: string,
  role: NipConflictRole = 'company',
): string {
  const digits = nip.replace(/\D/g, '');
  const displayNip = digits || nip.trim();

  if (!displayNip) {
    return REGISTRATION_ERRORS.nipAlreadyRegistered;
  }

  switch (role) {
    case 'management':
      return `NIP ${displayNip} firmy zarządzającej jest już zarejestrowany na platformie. Zaloguj się na istniejące konto lub użyj innego NIP.`;
    case 'community':
      return `NIP ${displayNip} wspólnoty jest już zarejestrowany na platformie. Zaloguj się na istniejące konto lub użyj innego NIP.`;
    default:
      return `NIP ${displayNip} jest już zarejestrowany na platformie. Jeśli to Twoja firma, zaloguj się na istniejące konto.`;
  }
}

export const EMAIL_CONFIRMED_LOGIN_MESSAGE =
  'Adres email został potwierdzony. Zaloguj się, aby kontynuować.';

const AUTH_ERROR_TRANSLATIONS: Record<string, string> = {
  'Invalid login credentials':
    'Nieprawidłowy adres email lub hasło. Sprawdź dane i spróbuj ponownie.',
  'Email not confirmed': 'Adres email nie został potwierdzony. Sprawdź skrzynkę odbiorczą.',
  'User already registered': REGISTRATION_ERRORS.emailAlreadyRegistered,
  'A user with this email address has already been registered':
    REGISTRATION_ERRORS.emailAlreadyRegistered,
  'Password should be at least 6 characters': 'Hasło musi mieć co najmniej 8 znaków.',
  'Signup requires a valid password': `Hasło musi mieć co najmniej ${8} znaków i zawierać literę oraz cyfrę.`,
  'Invalid API key':
    'Nie udało się dokończyć rejestracji z powodu błędu konfiguracji serwera. Spróbuj ponownie za chwilę albo napisz na kontakt@vestiqo.pl.',
  'email rate limit exceeded': REGISTRATION_ERRORS.emailRateLimitExceeded,
  'over_email_send_rate_limit': REGISTRATION_ERRORS.emailRateLimitExceeded,
};

function matchesPkceVerifierMissing(lower: string): boolean {
  return lower.includes('pkce code verifier not found');
}

function matchesEmailAlreadyRegistered(lower: string): boolean {
  return (
    lower.includes('already been registered') ||
    lower.includes('user already registered') ||
    lower.includes('email address already registered') ||
    lower.includes('email already in use') ||
    (lower.includes('duplicate key value') && lower.includes('email'))
  );
}

function matchesEmailRateLimit(lower: string): boolean {
  return (
    lower.includes('email rate limit exceeded') ||
    lower.includes('over_email_send_rate_limit') ||
    (lower.includes('rate limit exceeded') && lower.includes('email'))
  );
}

function matchesNipAlreadyRegistered(lower: string): boolean {
  return (
    lower.includes('nip') &&
    (lower.includes('duplicate') ||
      lower.includes('unique constraint') ||
      lower.includes('already exists') ||
      lower.includes('already registered'))
  );
}

/** True when a DB unique/duplicate error is about email, not NIP. */
export function matchesEmailUniqueConstraint(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes('duplicate') || lower.includes('unique')) &&
    lower.includes('email') &&
    !lower.includes('nip')
  );
}

/** Map company/profile insert unique violations without blaming NIP by default. */
export function translateRegistrationInsertError(
  message: string,
  options?: { nip?: string; role?: NipConflictRole },
): string {
  const lower = message.toLowerCase();

  if (matchesNipAlreadyRegistered(lower)) {
    if (options?.nip) {
      return nipAlreadyRegisteredMessage(options.nip, options.role ?? 'company');
    }
    return REGISTRATION_ERRORS.nipAlreadyRegistered;
  }

  if (matchesEmailUniqueConstraint(message) || matchesEmailAlreadyRegistered(lower)) {
    return REGISTRATION_ERRORS.emailAlreadyRegistered;
  }

  if (lower.includes('duplicate') || lower.includes('unique')) {
    return 'Nie udało się utworzyć konta — konflikt danych. Sprawdź email i NIP albo spróbuj ponownie.';
  }

  return translateAuthErrorMessage(message);
}

export function translateAuthErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Wystąpił błąd. Spróbuj ponownie.';
  }

  const direct = AUTH_ERROR_TRANSLATIONS[trimmed];
  if (direct) {
    return direct;
  }

  const lower = trimmed.toLowerCase();

  if (matchesInvalidLoginCredentials(lower)) {
    return AUTH_ERROR_TRANSLATIONS['Invalid login credentials'];
  }

  if (matchesEmailAlreadyRegistered(lower)) {
    return REGISTRATION_ERRORS.emailAlreadyRegistered;
  }

  if (matchesEmailRateLimit(lower)) {
    return REGISTRATION_ERRORS.emailRateLimitExceeded;
  }

  if (lower.includes('invalid api key') || lower.includes('invalid jwt')) {
    return AUTH_ERROR_TRANSLATIONS['Invalid API key'];
  }

  if (matchesPkceVerifierMissing(lower)) {
    return EMAIL_CONFIRMED_LOGIN_MESSAGE;
  }

  if (matchesNipAlreadyRegistered(lower)) {
    return REGISTRATION_ERRORS.nipAlreadyRegistered;
  }

  return trimmed;
}

function matchesInvalidLoginCredentials(lower: string): boolean {
  return lower.includes('invalid login credentials');
}

/** Registration and auth errors — use on /rejestracja and in registerAction. */
export function translateRegistrationErrorMessage(message: string): string {
  return translateAuthErrorMessage(message);
}
