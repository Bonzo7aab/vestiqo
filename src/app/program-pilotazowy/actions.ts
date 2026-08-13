'use server';

import { instrumentServerAction } from '../../lib/sentry/instrument-server-action';
import { companyLegal } from '../../lib/content/company-legal';
import {
  pilotProgramContent,
  pilotRoleOptions,
  type PilotRole,
} from '../../lib/content/program-pilotazowy';
import { getPostHogClient } from '../../lib/posthog-server';
import {
  buildContactFormEmailHtml,
  buildPilotFormEmailSubject,
} from '../../lib/email/contact-form-template';
import { isValidEmail } from '../../lib/email/validate-email';

interface PilotApplicationResult {
  success: boolean;
  error?: string;
}

function isPilotRole(value: string): value is PilotRole {
  return pilotRoleOptions.some((option) => option.value === value);
}

function getRoleLabel(role: PilotRole): string {
  return pilotRoleOptions.find((option) => option.value === role)?.label ?? role;
}

async function submitPilotApplicationImpl(
  formData: FormData,
): Promise<PilotApplicationResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const roleValue = String(formData.get('role') ?? '');

  if (!name || !email) {
    return { success: false, error: 'Uzupełnij wszystkie wymagane pola.' };
  }

  if (!isPilotRole(roleValue)) {
    return { success: false, error: 'Wybierz rolę: zarządca lub wykonawca.' };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Podaj poprawny adres e-mail.' };
  }

  const subject = pilotProgramContent.emailSubject;
  const message = note || 'Zgłoszenie bez dodatkowej notatki.';
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_FORM_TO_EMAIL ?? companyLegal.emails.contact;

  if (!apiKey || !from) {
    console.info('Pilot application submission (email not configured):', {
      name,
      email,
      phone,
      role: roleValue,
      note,
    });
    return { success: true };
  }

  const html = buildContactFormEmailHtml({
    roleLabel: getRoleLabel(roleValue),
    name,
    email,
    phone: phone || undefined,
    subject,
    message,
  });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: buildPilotFormEmailSubject(subject),
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Pilot application Resend error:', res.status, text);
    return {
      success: false,
      error: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.',
    };
  }

  getPostHogClient()?.capture({
    distinctId: email,
    event: 'pilot_form_submitted',
    properties: { role: roleValue },
  });
  return { success: true };
}

export const submitPilotApplication = instrumentServerAction(
  'submitPilotApplication',
  submitPilotApplicationImpl,
);
