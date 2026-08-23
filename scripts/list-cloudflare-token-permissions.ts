/**
 * List Cloudflare permissions available for your account.
 *
 * Usage:
 *   npx tsx scripts/list-cloudflare-token-permissions.ts
 *   npx tsx scripts/list-cloudflare-token-permissions.ts flagship
 *
 * Uses CLOUDFLARE_FLAGSHIP_API_TOKEN or CLOUDFLARE_API_TOKEN from .env.local.
 * Requires a token that can call account IAM APIs (most account-scoped user tokens work).
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

interface IamPermissionGroup {
  id: string;
  name: string;
  meta?: { scopes?: string; description?: string };
}

interface IamListResponse {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: IamPermissionGroup[];
}

const searchArg = process.argv[2]?.trim().toLowerCase();

async function main(): Promise<void> {
  const token =
    process.env.CLOUDFLARE_FLAGSHIP_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

  if (!token || !accountId) {
    console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_FLAGSHIP_API_TOKEN in .env.local');
    process.exit(1);
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/iam/permission_groups`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const data = (await res.json()) as IamListResponse;
  if (!res.ok || !data.success) {
    console.error('Failed:', data.errors?.[0]?.message ?? `HTTP ${res.status}`);
    process.exit(1);
  }

  const groups = (data.result ?? []).sort((a, b) => a.name.localeCompare(b.name));
  const filtered = searchArg
    ? groups.filter((g) => g.name.toLowerCase().includes(searchArg))
    : groups;

  console.log(`Account IAM permission groups (${filtered.length}${searchArg ? ` matching "${searchArg}"` : ''})\n`);

  for (const g of filtered) {
    const scope = g.meta?.scopes ? ` [${g.meta.scopes}]` : '';
    console.log(`${g.name}${scope}`);
    console.log(`  id: ${g.id}`);
  }

  const flagship = groups.filter((g) => /flagship/i.test(g.name));
  if (flagship.length > 0) {
    console.log('\n--- Flagship (for API tokens: use these names in Custom Token builder) ---');
    for (const g of flagship) {
      console.log(`  ${g.name}  →  id: ${g.id}`);
    }
    console.log(
      '\nFor Domio flag evaluation, create a user token (My Profile → API Tokens) with:',
    );
    console.log('  Account → Flagship Read  (docs call this "Flagship Evaluate"; there is no separate Evaluate row)');
    console.log('  Account resources: your account');
  } else {
    console.log('\n(No Flagship permissions on this account.)');
  }

  const docsDir = resolve(process.cwd(), 'docs');
  mkdirSync(docsDir, { recursive: true });
  const outPath = resolve(docsDir, 'cloudflare-iam-permission-groups.json');
  writeFileSync(
    outPath,
    JSON.stringify(
      groups.map((g) => ({ id: g.id, name: g.name, scopes: g.meta?.scopes })),
      null,
      2,
    ),
  );
  console.log(`\nFull list written to docs/cloudflare-iam-permission-groups.json (${groups.length} groups)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
