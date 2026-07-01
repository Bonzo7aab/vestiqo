/**
 * Normalize a KRS number to 10 zero-padded digits.
 */
export function formatKrsNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return digits.padStart(10, '0');
}
