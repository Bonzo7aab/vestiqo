import { signEmailVerificationToken } from '../auth/email-verification-token';
import {
  buildManagerEmailVerificationHtml,
  MANAGER_EMAIL_VERIFICATION_SUBJECT,
} from './manager-email-verification-template';

export async function sendManagerEmailVerification(params: {
  toEmail: string;
  userId: string;
  origin: string;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, skippedReason: 'RESEND_API_KEY or RESEND_FROM_EMAIL not configured' };
  }

  const token = signEmailVerificationToken(params.userId);
  const confirmUrl = `${params.origin}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const body = {
    from,
    to: params.toEmail,
    subject: MANAGER_EMAIL_VERIFICATION_SUBJECT,
    html: buildManagerEmailVerificationHtml({ confirmUrl }),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Manager email verification Resend error:', res.status, text);
    return { sent: false, skippedReason: `Resend HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  return { sent: true };
}

export function isManagerEmailVerificationConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
