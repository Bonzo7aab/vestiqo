#!/usr/bin/env npx tsx
/**
 * Configure Supabase Auth custom SMTP (Resend) with noreply@vestiqo.pl sender.
 * Requires SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)
 * and RESEND_API_KEY in .env.local.
 *
 * Usage: npx tsx scripts/configure-supabase-auth-smtp.ts [project-ref ...]
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DEFAULT_PROJECT_REFS = ['hcnoqbnschbsxsjrbxao', 'fabbgaqxsetnsppxegnx'] as const;

interface AuthConfigPatch {
  external_email_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_admin_email: string;
  smtp_sender_name: string;
}

async function patchAuthSmtp(projectRef: string, token: string, patch: AuthConfigPatch): Promise<void> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${projectRef} failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const body = (await res.json()) as {
    smtp_admin_email?: string;
    smtp_sender_name?: string;
    smtp_host?: string;
  };

  console.log(
    `✅ ${projectRef}: SMTP sender ${body.smtp_sender_name ?? patch.smtp_sender_name} <${body.smtp_admin_email ?? patch.smtp_admin_email}> via ${body.smtp_host ?? patch.smtp_host}`,
  );
}

async function main(): Promise<void> {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!token) {
    console.error('❌ Missing SUPABASE_ACCESS_TOKEN (create at https://supabase.com/dashboard/account/tokens)');
    process.exit(1);
  }

  if (!resendApiKey) {
    console.error('❌ Missing RESEND_API_KEY in .env.local');
    process.exit(1);
  }

  const projectRefs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [...DEFAULT_PROJECT_REFS];

  const patch: AuthConfigPatch = {
    external_email_enabled: true,
    smtp_host: 'smtp.resend.com',
    smtp_port: 465,
    smtp_user: 'resend',
    smtp_pass: resendApiKey,
    smtp_admin_email: 'noreply@vestiqo.pl',
    smtp_sender_name: 'Vestiqo',
  };

  console.log('Configuring Supabase Auth SMTP (Resend, noreply@vestiqo.pl)…\n');

  for (const projectRef of projectRefs) {
    await patchAuthSmtp(projectRef, token, patch);
  }

  console.log('\nPaste supabase/templates/confirmation.html into Dashboard → Auth → Email Templates if templates diverge.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
