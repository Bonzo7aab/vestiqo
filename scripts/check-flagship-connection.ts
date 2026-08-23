/**
 * Diagnose Cloudflare Flagship connectivity (no secrets printed).
 * Usage: npx tsx scripts/check-flagship-connection.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
import { OpenFeature } from '@openfeature/server-sdk';
import { FlagshipServerProvider } from '@cloudflare/flagship/server';
import { FLAGSHIP_FLAG_KEYS, TESTING_FEATURE_FLAG_KEYS } from '../src/lib/flagship/keys';

function mask(value: string | undefined): string {
  if (!value) return '(missing)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

async function main(): Promise<void> {
  const appId = process.env.FLAGSHIP_APP_ID?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const authToken = process.env.CLOUDFLARE_FLAGSHIP_API_TOKEN?.trim();

  console.log('Flagship connection check\n');
  console.log('Environment:');
  console.log(`  FLAGSHIP_APP_ID:              ${mask(appId)}`);
  console.log(`  CLOUDFLARE_ACCOUNT_ID:        ${mask(accountId)}`);
  console.log(`  CLOUDFLARE_FLAGSHIP_API_TOKEN: ${mask(authToken)}`);
  if (authToken?.startsWith('cfat_')) {
    console.log('  Token kind:                    Account API Token (cfat_) — evaluate only; flags list needs cfut_');
  } else if (authToken?.startsWith('cfut_')) {
    console.log('  Token kind:                    User API Token (cfut_)');
  }

  const missing = [
    !appId && 'FLAGSHIP_APP_ID',
    !accountId && 'CLOUDFLARE_ACCOUNT_ID',
    !authToken && 'CLOUDFLARE_FLAGSHIP_API_TOKEN',
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`\n❌ Missing: ${missing.join(', ')}`);
    process.exit(1);
  }

  const provider = new FlagshipServerProvider({
    appId: appId!,
    accountId: accountId!,
    authToken: authToken!,
    logging: true,
  });

  console.log('\nInitializing provider…');
  try {
    await OpenFeature.setProviderAndWait(provider);
  } catch (initErr) {
    console.error('  Init threw:', initErr instanceof Error ? initErr.message : initErr);
  }
  const status = provider.status;
  console.log(`  Provider status: ${status}`);

  // Probe Cloudflare v4 evaluate API (path is /accounts/, not /kontos/).
  const probeParams = new URLSearchParams({
    flagKey: FLAGSHIP_FLAG_KEYS.NEW_TENDER_SYSTEM,
    targetingKey: 'flagship-connection-test',
  });
  const probeUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/flagship/apps/${appId}/evaluate?${probeParams}`;
  console.log('\nRaw API probe (GET /accounts/.../evaluate):');
  let probeOk = false;
  try {
    const res = await fetch(probeUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body = await res.text();
    console.log(`  HTTP ${res.status} ${res.statusText}`);
    console.log(`  Body (first 400 chars): ${body.slice(0, 400)}`);
    probeOk = res.ok;
    if (res.status === 401) {
      console.log('\n  → 401 = invalid token or missing Flagship Read on this account.');
      console.log('    Create: dash.cloudflare.com → My Profile → API Tokens → Custom token');
      console.log('    Permissions: Account → Flagship Read  (run: npm run flagship:list-permissions)');
      console.log('    Account resources: include this account. Use the token value once, update .env.local');
    }
    if (res.status === 404) {
      console.log('\n  → 404 = wrong account ID, app ID, or flag key "new-tender-system".');
    }
    if (res.status === 400 && body.includes('No route for that URI')) {
      console.log('\n  → 400 No route = wrong API path. Use /client/v4/accounts/{id}/flagship/...');
    }
  } catch (probeErr) {
    console.error('  Probe failed:', probeErr instanceof Error ? probeErr.message : probeErr);
  }

  const flagsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/flagship/apps/${appId}/flags`;
  console.log('\nManagement API probe (GET /accounts/.../flags) — used by /administracja/flagi:');
  let flagsOk = false;
  try {
    const res = await fetch(flagsUrl, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body = await res.text();
    console.log(`  HTTP ${res.status} ${res.statusText}`);
    console.log(`  Body (first 400 chars): ${body.slice(0, 400)}`);
    flagsOk = res.ok;
    if (res.status === 401 || res.status === 403) {
      if (authToken!.startsWith('cfat_')) {
        console.log('\n  → This is an Account API Token (prefix cfat_). Evaluate is allowed,');
        console.log('    but Flagship GET/PUT /flags is not — that needs a User API Token.');
        console.log('    Create: dash.cloudflare.com → profile icon → My Profile → API Tokens');
        console.log('    (not Manage Account → Account API Tokens). Custom token:');
        console.log('    Account → Flagship → Read + Edit. New value starts with cfut_.');
      } else {
        console.log('\n  → Auth rejected. Create token (My Profile → API Tokens), copy the value once,');
        console.log('    set CLOUDFLARE_FLAGSHIP_API_TOKEN, restart next dev / redeploy Vercel.');
        console.log('    Permissions: Account → Flagship Read + Flagship Edit (not “Write”).');
      }
    }
  } catch (flagsErr) {
    console.error('  Flags probe failed:', flagsErr instanceof Error ? flagsErr.message : flagsErr);
  }

  if (status !== 'READY' || !probeOk) {
    console.error('\n❌ Flagship connection failed (provider not READY or evaluate probe not 2xx).');
    process.exit(1);
  }

  if (!flagsOk) {
    if (authToken!.startsWith('cfat_')) {
      console.warn(
        '\n⚠️  Evaluate OK, but GET /flags is forbidden because this is an Account API Token (cfat_).',
      );
      console.warn('    Admin toggles need a User API Token from My Profile → API Tokens (prefix cfut_).');
    } else {
      console.warn(
        '\n⚠️  Evaluate OK, but GET /flags is forbidden. Admin toggles need Flagship Read + Edit on this token.',
      );
    }
  }

  const client = OpenFeature.getClient();
  const context = { targetingKey: 'flagship-connection-test' };

  console.log('\nEvaluating flags (anonymous test context):');
  for (const key of TESTING_FEATURE_FLAG_KEYS) {
    const details = await client.getBooleanDetails(key, false, context);
    const ok = details.errorCode === undefined;
    const symbol = ok ? '✓' : '✗';
    console.log(
      `  ${symbol} ${key}: value=${details.value} reason=${details.reason}` +
        (details.variant ? ` variant=${details.variant}` : '') +
        (details.errorCode ? ` error=${details.errorCode} (${details.errorMessage})` : ''),
    );
  }

  const headerFlag = await client.getBooleanDetails(
    FLAGSHIP_FLAG_KEYS.NEW_TENDER_SYSTEM,
    false,
    context,
  );
  console.log('\nHeader branding (new-tender-system):');
  console.log(`  Would show: ${headerFlag.value ? 'Vestiqo' : 'Domio'}`);

  if (headerFlag.reason === 'DISABLED') {
    console.log('\n⚠️  Flag is DISABLED in Flagship — enable it and set default variation to true.');
  }
  if (headerFlag.errorCode === 'FLAG_NOT_FOUND') {
    console.log('\n⚠️  Flag not found — create "new-tender-system" in the same app as FLAGSHIP_APP_ID.');
  }

  console.log('\n✅ Flagship API connection OK (provider READY, evaluations completed).');
}

main().catch((err) => {
  console.error('\n❌ Check failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
