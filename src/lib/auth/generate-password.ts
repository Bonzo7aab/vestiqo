import { randomBytes } from 'crypto';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL_CHARS = `${UPPERCASE}${LOWERCASE}${DIGITS}`;

const DEFAULT_LENGTH = 16;

function pickRandomChar(charset: string): string {
  const index = randomBytes(1)[0]! % charset.length;
  return charset[index]!;
}

/**
 * Generates a random password suitable for Supabase Auth (min 6 chars).
 * Ensures at least one uppercase, lowercase, and digit.
 */
export function generateSecurePassword(length = DEFAULT_LENGTH): string {
  const safeLength = Math.max(6, length);
  const chars: string[] = [
    pickRandomChar(UPPERCASE),
    pickRandomChar(LOWERCASE),
    pickRandomChar(DIGITS),
  ];

  for (let i = chars.length; i < safeLength; i += 1) {
    chars.push(pickRandomChar(ALL_CHARS));
  }

  const shuffled = [...chars];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0]! % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  return shuffled.join('');
}
