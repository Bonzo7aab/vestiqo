import 'server-only';

import { cookies } from 'next/headers';
import {
  IMPERSONATION_COOKIE_NAME,
  readImpersonationFromCookieGetter,
} from '../admin/impersonation';

export const IMPERSONATION_READ_ONLY_ERROR =
  'Podgląd użytkownika jest tylko do odczytu. Zakończ podgląd, aby wykonać tę akcję.';

export async function isImpersonationActive(actorId?: string): Promise<boolean> {
  const cookieStore = await cookies();
  const impersonation = readImpersonationFromCookieGetter(
    (name) => cookieStore.get(name)?.value,
    actorId,
  );
  return impersonation !== null;
}

export async function assertNotImpersonating(actorId?: string): Promise<void> {
  if (await isImpersonationActive(actorId)) {
    throw new Error(IMPERSONATION_READ_ONLY_ERROR);
  }
}

export async function getImpersonationSubjectUserId(
  actorId: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const impersonation = readImpersonationFromCookieGetter(
    (name) => cookieStore.get(name)?.value,
    actorId,
  );
  return impersonation?.subjectUserId ?? null;
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}
