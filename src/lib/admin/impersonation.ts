import { createHmac, timingSafeEqual } from 'crypto';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { supabaseCookieOptions } from '../supabase/cookie-options';

export const IMPERSONATION_COOKIE_NAME = 'domio_impersonate';
export const IMPERSONATION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type ImpersonationSubjectUserType = 'manager' | 'contractor';

export interface ImpersonationPayload {
  v: 1;
  actorId: string;
  subjectUserId: string;
  subjectUserType: ImpersonationSubjectUserType;
  startedAt: number;
}

export function getImpersonationSecret(): string {
  const secret = process.env.IMPERSONATION_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('IMPERSONATION_COOKIE_SECRET is required in production');
  }
  return secret ?? 'dev-impersonation-secret-change-me';
}

export function signImpersonationPayload(payload: ImpersonationPayload): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getImpersonationSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function verifyImpersonationCookieValue(
  value: string,
  expectedActorId?: string,
): ImpersonationPayload | null {
  const dotIndex = value.lastIndexOf('.');
  if (dotIndex <= 0) {
    return null;
  }

  const payloadB64 = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);

  const expectedSignature = createHmac('sha256', getImpersonationSecret())
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
    (parsed as ImpersonationPayload).v !== 1 ||
    typeof (parsed as ImpersonationPayload).actorId !== 'string' ||
    typeof (parsed as ImpersonationPayload).subjectUserId !== 'string' ||
    ((parsed as ImpersonationPayload).subjectUserType !== 'manager' &&
      (parsed as ImpersonationPayload).subjectUserType !== 'contractor') ||
    typeof (parsed as ImpersonationPayload).startedAt !== 'number'
  ) {
    return null;
  }

  const payload = parsed as ImpersonationPayload;

  if (expectedActorId && payload.actorId !== expectedActorId) {
    return null;
  }

  if (Date.now() - payload.startedAt > IMPERSONATION_MAX_AGE_MS) {
    return null;
  }

  return payload;
}

export function readImpersonationFromCookieGetter(
  getCookie: (name: string) => string | undefined,
  expectedActorId?: string,
): ImpersonationPayload | null {
  const value = getCookie(IMPERSONATION_COOKIE_NAME);
  if (!value) {
    return null;
  }
  return verifyImpersonationCookieValue(value, expectedActorId);
}

export function getImpersonationCookieOptions(): Partial<ResponseCookie> {
  return {
    ...supabaseCookieOptions,
    httpOnly: true,
    maxAge: Math.floor(IMPERSONATION_MAX_AGE_MS / 1000),
  };
}

export function subjectUserTypeLabel(userType: ImpersonationSubjectUserType): string {
  return userType === 'manager' ? 'zarządca' : 'wykonawca';
}
