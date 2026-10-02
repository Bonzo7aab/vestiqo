'use server';

import { instrumentServerAction } from '../sentry/instrument-server-action';
import { createAdminClientOrNull } from '../supabase/admin';
import { maskEmail } from './mask-email';
import { issueTemporaryPassword } from './issue-temporary-password';
import { resolveNipRecovery } from './nip-recovery';

export type StartAccountRecoveryResult =
  | { kind: 'community_claim' }
  | { kind: 'email_sent'; maskedEmail: string }
  | { kind: 'not_found' }
  | { error: string };

const UNAVAILABLE = 'Nie udało się sprawdzić konta. Spróbuj ponownie.';

async function startAccountRecoveryByNipActionImpl(
  nip: string,
): Promise<StartAccountRecoveryResult> {
  const admin = createAdminClientOrNull();
  if (!admin) {
    console.error('startAccountRecoveryByNip: missing elevated Supabase key');
    return { error: UNAVAILABLE };
  }

  const resolved = await resolveNipRecovery(admin, nip);
  if ('error' in resolved) {
    return { error: resolved.error };
  }
  if (resolved.kind === 'not_found') {
    return { kind: 'not_found' };
  }
  if (resolved.kind === 'community_claim') {
    return { kind: 'community_claim' };
  }

  try {
    await issueTemporaryPassword(admin, resolved.email);
  } catch (error) {
    console.error('startAccountRecoveryByNip: password issue failed', error);
    return { error: UNAVAILABLE };
  }

  return { kind: 'email_sent', maskedEmail: maskEmail(resolved.email) };
}

export const startAccountRecoveryByNipAction = instrumentServerAction(
  'startAccountRecoveryByNipAction',
  startAccountRecoveryByNipActionImpl,
);
