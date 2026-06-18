import {
  buildPasswordResetEmailHtml,
  PASSWORD_RESET_EMAIL_SUBJECT,
} from './password-reset-template';

export async function sendPasswordResetEmail(params: {
  toEmail: string;
  password: string;
  loginUrl: string;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, skippedReason: 'RESEND_API_KEY or RESEND_FROM_EMAIL not configured' };
  }

  const body = {
    from,
    to: params.toEmail,
    subject: PASSWORD_RESET_EMAIL_SUBJECT,
    html: buildPasswordResetEmailHtml({
      password: params.password,
      loginUrl: params.loginUrl,
    }),
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
    console.error('Password reset Resend error:', res.status, text);
    return { sent: false, skippedReason: `Resend HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  return { sent: true };
}

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}
