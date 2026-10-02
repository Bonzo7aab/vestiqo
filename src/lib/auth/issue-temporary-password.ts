import type { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import type { Database } from '../../types/database';
import { generateSecurePassword } from './generate-password';
import { getPublicAppOrigin } from './app-origin';
import { findAuthUserByEmail } from './find-user-by-email';
import { sendPasswordResetEmail } from '../email/send-password-reset-email';

/**
 * Sets a new temporary password and emails it. Missing users and send failures are logged, not thrown.
 */
export async function issueTemporaryPassword(
  admin: SupabaseClient<Database>,
  email: string,
): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return;
  }

  const user = await findAuthUserByEmail(admin, trimmed);
  if (!user) {
    return;
  }

  const newPassword = generateSecurePassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error('issueTemporaryPassword: updateUserById failed', updateError.message);
    Sentry.captureException(updateError, { extra: { email: trimmed } });
    return;
  }

  const sendResult = await sendPasswordResetEmail({
    toEmail: trimmed,
    password: newPassword,
    loginUrl: `${getPublicAppOrigin()}/logowanie`,
  });

  if (!sendResult.sent) {
    console.error(
      'issueTemporaryPassword: Resend failed',
      sendResult.skippedReason ?? 'unknown',
    );
    Sentry.captureMessage('Password reset email not sent', {
      extra: { email: trimmed, reason: sendResult.skippedReason },
    });
  }
}
