/** Strip to digits only. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Extract 9-digit Polish national number (without country code). */
export function extractPolishNationalNumber(value: string): string | null {
  const digits = digitsOnly(value);

  if (digits.length === 11 && digits.startsWith('48')) {
    return digits.slice(2);
  }

  if (digits.length === 9) {
    return digits;
  }

  return null;
}

/** Normalize to E.164 (+48XXXXXXXXX) when valid; otherwise returns trimmed input digits with + prefix attempt. */
export function normalizePolishPhone(value: string): string {
  const national = extractPolishNationalNumber(value);
  if (national) {
    return `+48${national}`;
  }

  const digits = digitsOnly(value);
  if (!digits) {
    return '';
  }

  if (digits.startsWith('48')) {
    return `+${digits}`;
  }

  return `+48${digits}`;
}

/**
 * Validates Polish phone numbers (mobile and landline).
 * Accepts +48, 48 prefix, or 9-digit national format.
 */
export function isValidPolishPhone(value: string): boolean {
  const national = extractPolishNationalNumber(value);
  if (!national || national.length !== 9) {
    return false;
  }

  if (!/^[1-9]\d{8}$/.test(national)) {
    return false;
  }

  // Reject obviously invalid patterns (all same digit, etc.)
  if (/^(\d)\1{8}$/.test(national)) {
    return false;
  }

  return true;
}

/** Display format: +48 XXX XXX XXX */
export function formatPolishPhoneDisplay(value: string): string {
  const national = extractPolishNationalNumber(value);
  if (!national) {
    return value.trim();
  }

  return `+48 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 9)}`.trim();
}

export const POLISH_PHONE_INVALID_MESSAGE =
  'Podaj prawidłowy numer telefonu (9 cyfr, np. +48 512 345 678)';
