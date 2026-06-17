export const INVALID_EMAIL_MESSAGE =
  'Podaj prawidłowy adres email (np. twoj@email.pl)';

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trimmed);
}
