#!/usr/bin/env npx tsx
/**
 * Validates password reset dependencies (Supabase admin + Resend).
 * Usage: npx tsx scripts/check-password-reset-config.ts
 * Loads .env.local when present.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createAdminClient, hasElevatedSupabaseKey } from '../src/lib/supabase/admin';
import { findAuthUserByEmail } from '../src/lib/auth/find-user-by-email';
import { isPasswordResetEmailConfigured } from '../src/lib/email/send-password-reset-email';

async function checkResendDomains(apiKey: string): Promise<void> {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error(`❌ Resend API key invalid or unreachable (HTTP ${res.status})`);
    return;
  }

  const body = (await res.json()) as {
    data?: Array<{ name: string; status: string }>;
  };
  const domains = body.data ?? [];
  const verified = domains.filter((d) => d.status === 'verified');

  console.log(`✅ Resend API key valid (${verified.length} verified domain(s))`);
  for (const domain of verified) {
    console.log(`   - ${domain.name}`);
  }

  const from = process.env.RESEND_FROM_EMAIL ?? '';
  const fromEmail = from.match(/<([^>]+)>/)?.[1] ?? from;
  const fromDomain = fromEmail.split('@')[1];
  if (fromDomain && !verified.some((d) => d.name === fromDomain)) {
    console.warn(
      `⚠️  RESEND_FROM_EMAIL domain "${fromDomain}" is not among verified Resend domains`,
    );
  }
}

async function main(): Promise<void> {
  console.log('Password reset configuration check\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log(supabaseUrl ? `Supabase URL: ${new URL(supabaseUrl).hostname}` : '❌ NEXT_PUBLIC_SUPABASE_URL missing');

  if (!hasElevatedSupabaseKey()) {
    console.error('❌ Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  } else {
    console.log('✅ Supabase elevated key present');
  }

  if (!isPasswordResetEmailConfigured()) {
    console.error('❌ Missing RESEND_API_KEY or RESEND_FROM_EMAIL');
  } else {
    console.log(`✅ Resend env present (from: ${process.env.RESEND_FROM_EMAIL})`);
    await checkResendDomains(process.env.RESEND_API_KEY!);
  }

  if (hasElevatedSupabaseKey() && supabaseUrl) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        console.error('❌ auth.admin.listUsers failed:', error.message);
      } else {
        console.log(`✅ auth.admin.listUsers OK (total sample: ${data.users?.length ?? 0} on page 1)`);
      }

      const testEmail = process.argv[2];
      if (testEmail) {
        const user = await findAuthUserByEmail(admin, testEmail);
        console.log(
          user
            ? `✅ findAuthUserByEmail("${testEmail}") → found ${user.id}`
            : `⚠️  findAuthUserByEmail("${testEmail}") → not found`,
        );
      }
    } catch (error) {
      console.error('❌ Admin client error:', error instanceof Error ? error.message : error);
    }
  }

  console.log('\nVercel: ensure all vars above are set for Production and redeploy after changes.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
