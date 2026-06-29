'use server';

import { instrumentServerAction } from '../../lib/sentry/instrument-server-action';
import { companyLegal } from '../../lib/content/company-legal';
import { contactRoleOptions, type ContactRole } from '../../lib/content/kontakt';
import { getPostHogClient } from '../../lib/posthog-server';
import {
  buildContactFormEmailHtml,
  buildContactFormEmailSubject,
} from '../../lib/email/contact-form-template';
import { isValidEmail } from '../../lib/email/validate-email';

interface ContactFormResult {
  success: boolean;
  error?: string;
}

function getRoleLabel(role: ContactRole): string {
  return contactRoleOptions.find((option) => option.value === role)?.label ?? role;
}

async function submitContactFormImpl(formData: FormData): Promise<ContactFormResult> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const role = String(formData.get('role') ?? 'other') as ContactRole;

  if (!name || !email || !subject || !message) {
    return { success: false, error: 'Uzupełnij wszystkie wymagane pola.' };
  }

  if (!isValidEmail(email)) {
    return { success: false, error: 'Podaj poprawny adres e-mail.' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_FORM_TO_EMAIL ?? companyLegal.emails.contact;

  if (!apiKey || !from) {
    console.info('Contact form submission (email not configured):', {
      name,
      email,
      phone,
      subject,
      role,
      message,
    });
    return { success: true };
  }

  const html = buildContactFormEmailHtml({
    roleLabel: getRoleLabel(role),
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
      subject: buildContactFormEmailSubject(subject),
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Contact form Resend error:', res.status, text);
    return { success: false, error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.' };
  }

  getPostHogClient()?.capture({
    distinctId: email,
    event: 'contact_form_submitted',
    properties: { role, subject },
  });
  return { success: true };
}

export const submitContactForm = instrumentServerAction('submitContactForm', submitContactFormImpl);
