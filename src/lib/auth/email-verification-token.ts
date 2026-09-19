import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_VERSION = 1;
export const EMAIL_VERIFICATION_TTL_MS = 72 * 60 * 60 * 1000;

export interface EmailVerificationPayload {
  v: typeof TOKEN_VERSION;
  userId: string;
  exp: number;
}

export function getEmailVerificationSecret(): string {
  const secret =
    process.env.EMAIL_VERIFICATION_TOKEN_SECRET ?? process.env.IMPERSONATION_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('EMAIL_VERIFICATION_TOKEN_SECRET is required in production');
  }
  return secret ?? 'dev-email-verification-secret-change-me';
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function signEmailVerificationToken(
  userId: string,
  nowMs = Date.now(),
  ttlMs = EMAIL_VERIFICATION_TTL_MS,
): string {
  const payload: EmailVerificationPayload = {
    v: TOKEN_VERSION,
    userId,
    exp: nowMs + ttlMs,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getEmailVerificationSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyEmailVerificationToken(
  token: string,
  nowMs = Date.now(),
): EmailVerificationPayload | null {
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex <= 0) {
    return null;
  }

  const payloadB64 = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expectedSignature = createHmac('sha256', getEmailVerificationSecret())
    .update(payloadB64)
    .digest('base64url');

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as EmailVerificationPayload).v !== TOKEN_VERSION ||
    typeof (parsed as EmailVerificationPayload).userId !== 'string' ||
    typeof (parsed as EmailVerificationPayload).exp !== 'number'
  ) {
    return null;
  }

  const payload = parsed as EmailVerificationPayload;
  if (!payload.userId || payload.exp <= nowMs) {
    return null;
  }

  return payload;
}
