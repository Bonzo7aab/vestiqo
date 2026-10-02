function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const COMMUNITY_CLAIM_APPROVED_EMAIL_SUBJECT = 'Konto wspólnoty zostało utworzone — Vestiqo';
export const COMMUNITY_CLAIM_REJECTED_EMAIL_SUBJECT = 'Wniosek o konto wspólnoty — Vestiqo';

export async function sendCommunityClaimApprovedEmail(params: {
  toEmail: string;
  password: string;
  loginUrl: string;
  communityName: string;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, skippedReason: 'RESEND_API_KEY or RESEND_FROM_EMAIL not configured' };
  }

  const communityName = escapeHtml(params.communityName);
  const password = escapeHtml(params.password);
  const loginUrl = escapeHtml(params.loginUrl);

  const html = `<p>Dzień dobry,</p>
<p>Wniosek o niezależne konto wspólnoty <strong>${communityName}</strong> został zaakceptowany.</p>
<p>Poniżej znajdziesz tymczasowe hasło. Zaloguj się i zmień je w ustawieniach konta.</p>
<p style="font-size:20px;font-weight:700;letter-spacing:0.04em;">${password}</p>
<p><a href="${loginUrl}">Zaloguj się</a></p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.toEmail,
      subject: COMMUNITY_CLAIM_APPROVED_EMAIL_SUBJECT,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Community claim approved Resend error:', res.status, text);
    return { sent: false, skippedReason: `Resend HTTP ${res.status}: ${text.slice(0, 200)}` };
  }

  return { sent: true };
}

export async function sendCommunityClaimRejectedEmail(params: {
  toEmail: string;
  reason: string;
  communityName: string;
}): Promise<{ sent: boolean; skippedReason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { sent: false, skippedReason: 'RESEND_API_KEY or RESEND_FROM_EMAIL not configured' };
  }

  const html = `<p>Dzień dobry,</p>
<p>Wniosek o niezależne konto wspólnoty <strong>${escapeHtml(params.communityName)}</strong> został odrzucony.</p>
<p><strong>Powód:</strong></p>
<p>${escapeHtml(params.reason)}</p>
<p>Możesz złożyć nowy wniosek po poprawkach.</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.toEmail,
      subject: COMMUNITY_CLAIM_REJECTED_EMAIL_SUBJECT,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Community claim rejected Resend error:', res.status, text);
    return { sent: false, skippedReason: `Resend HTTP ${res.status}` };
  }

  return { sent: true };
}
