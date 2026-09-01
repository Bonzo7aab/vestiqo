/**
 * Contact form notification email — styled like `password-reset-template.ts`
 * and `supabase/templates/confirmation.html`. Sent via Resend.
 */
export const CONTACT_FORM_EMAIL_SUBJECT_PREFIX = '[Kontakt Vestiqo]';

export interface ContactFormEmailParams {
  roleLabel: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMultiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function fieldRow(label: string, value: string, options?: { multiline?: boolean }): string {
  const content = options?.multiline ? formatMultiline(value) : escapeHtml(value);

  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #E2E8F0;">
      <p style="margin:0 0 4px;color:#64748B;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(label)}</p>
      <p style="margin:0;color:#0F172A;font-size:15px;line-height:1.55;">${content}</p>
    </td>
  </tr>`;
}

export function buildContactFormEmailSubject(subject: string): string {
  return `${CONTACT_FORM_EMAIL_SUBJECT_PREFIX} ${subject}`;
}

export function buildContactFormEmailHtml(params: ContactFormEmailParams): string {
  const email = escapeHtml(params.email);
  const phoneRow = params.phone?.trim()
    ? fieldRow('Telefon', params.phone.trim())
    : '';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>Formularz kontaktowy — Vestiqo</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#1D4ED8 0%,#2563EB 100%);padding:36px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#BFDBFE;">Vestiqo</p>
              <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;">Formularz kontaktowy</h1>
              <p style="margin:12px 0 0;color:#EFF6FF;font-size:14px;line-height:1.5;">Nowe zapytanie ze strony vestiqo.pl</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 32px;">
              <p style="margin:0 0 12px;color:#0F172A;font-size:16px;line-height:1.6;font-weight:500;">Nowe zapytanie</p>
              <p style="margin:0 0 28px;color:#334155;font-size:15px;line-height:1.65;">
                Otrzymano wiadomość z formularza kontaktowego na stronie <strong style="color:#0F172A;">Vestiqo</strong>. Odpowiedz bezpośrednio na adres nadawcy — wiadomość ma ustawione pole <strong style="color:#0F172A;">Reply-To</strong>.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;border-radius:10px;border:1px solid #E2E8F0;margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${fieldRow('Rola', params.roleLabel)}
                      ${fieldRow('Imię i nazwisko', params.name)}
                      ${fieldRow('E-mail', params.email)}
                      ${phoneRow}
                      ${fieldRow('Temat', params.subject)}
                      ${fieldRow('Wiadomość', params.message, { multiline: true })}
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 8px;">
                <tr>
                  <td align="center" style="border-radius:10px;background-color:#2563EB;">
                    <a href="mailto:${email}?subject=${encodeURIComponent(`Re: ${params.subject}`)}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:16px;font-weight:600;text-decoration:none;border-radius:10px;line-height:1.2;">
                      Odpowiedz na wiadomość
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#64748B;font-size:13px;line-height:1.55;text-align:center;">
                Nadawca: <a href="mailto:${email}" style="color:#2563EB;text-decoration:underline;">${email}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 6px;color:#64748B;font-size:12px;line-height:1.5;">
                © Vestiqo · Platforma konkursów w nieruchomościach
              </p>
              <p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.5;">
                <a href="mailto:kontakt@vestiqo.pl" style="color:#64748B;text-decoration:none;">kontakt@vestiqo.pl</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
