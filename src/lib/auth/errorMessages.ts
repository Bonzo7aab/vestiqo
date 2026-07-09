export const REGISTRATION_ERRORS = {
  emailAlreadyRegistered:
    'Konto z tym adresem email już istnieje. Zaloguj się lub użyj innego adresu.',
  nipAlreadyRegistered:
    'Firma z tym numerem NIP jest już zarejestrowana na platformie. Jeśli to Twoja firma, zaloguj się na istniejące konto.',
  emailRateLimitExceeded:
    'Osiągnięto limit wysyłki wiadomości e-mail. Odczekaj kilka minut i spróbuj ponownie. Jeśli problem się powtarza, napisz na kontakt@vestiqo.pl.',
} as const;

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
    lower.includes('duplicate key value') && lower.includes('email')
  );
}

function matchesEmailRateLimit(lower: string): boolean {
  return (
    lower.includes('email rate limit exceeded') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('rate limit exceeded') && lower.includes('email')
  );
}

function matchesNipAlreadyRegistered(lower: string): boolean {
  return (
    lower.includes('nip') &&
    (lower.includes('duplicate') ||
      lower.includes('unique constraint') ||
      lower.includes('already exists'))
  );
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
