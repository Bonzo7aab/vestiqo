#!/usr/bin/env npx tsx
/**
 * Reset vestiqo-test accounts:
 * - Keep only admin@vestiqo.pl
 * - Create zarzadca1..3 and wykonawca1..3 with password Test12!@
 *
 * Refuses production. Usage: npx tsx scripts/reset-test-accounts.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test-cloud.local') });

const TEST_PROJECT_REF = 'hcnoqbnschbsxsjrbxao';
const PROD_PROJECT_REF = 'fabbgaqxsetnsppxegnx';
const KEEP_EMAIL = 'admin@vestiqo.pl';
const PASSWORD = 'Test12!@';

interface SeedUser {
  email: string;
  userType: 'manager' | 'contractor';
  firstName: string;
  lastName: string;
  accountRole: string;
  organizationType: string | null;
  companyName: string;
  companyType: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'zarzadca1@vestiqo.pl',
    userType: 'manager',
    firstName: 'Zarzadca',
    lastName: '1',
    accountRole: 'condo_board',
    organizationType: 'wspólnota',
    companyName: 'Wspólnota Mieszkaniowa Test 1',
    companyType: 'wspólnota',
  },
  {
    email: 'zarzadca2@vestiqo.pl',
    userType: 'manager',
    firstName: 'Zarzadca',
    lastName: '2',
    accountRole: 'condo_board',
    organizationType: 'wspólnota',
    companyName: 'Wspólnota Mieszkaniowa Test 2',
    companyType: 'wspólnota',
  },
  {
    email: 'zarzadca3@vestiqo.pl',
    userType: 'manager',
    firstName: 'Zarzadca',
    lastName: '3',
    accountRole: 'property_manager',
    organizationType: 'wspólnota',
    companyName: 'Administracja Wspólnot Test 3',
    companyType: 'property_management',
  },
  {
    email: 'wykonawca1@vestiqo.pl',
    userType: 'contractor',
    firstName: 'Wykonawca',
    lastName: '1',
    accountRole: 'contractor',
    organizationType: null,
    companyName: 'Firma Wykonawcza Test 1',
    companyType: 'contractor',
  },
  {
    email: 'wykonawca2@vestiqo.pl',
    userType: 'contractor',
    firstName: 'Wykonawca',
    lastName: '2',
    accountRole: 'contractor',
    organizationType: null,
    companyName: 'Firma Wykonawcza Test 2',
    companyType: 'contractor',
  },
  {
    email: 'wykonawca3@vestiqo.pl',
    userType: 'contractor',
    firstName: 'Wykonawca',
    lastName: '3',
    accountRole: 'contractor',
    organizationType: null,
    companyName: 'Firma Wykonawcza Test 3',
    companyType: 'contractor',
  },
];

function assertTestEnvironment(url: string): void {
  if (url.includes(PROD_PROJECT_REF)) {
    throw new Error(`Refusing to run against production (${PROD_PROJECT_REF}).`);
  }
  if (!url.includes(TEST_PROJECT_REF)) {
    throw new Error(
      `Refusing to run: URL is not vestiqo-test (${TEST_PROJECT_REF}): ${url}`,
    );
  }
}

function createAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / service role key');
  }
  assertTestEnvironment(url);
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function listAllUsers(
  admin: ReturnType<typeof createAdmin>,
): Promise<Array<{ id: string; email?: string | null }>> {
  const users: Array<{ id: string; email?: string | null }> = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 200) break;
    page += 1;
  }
  return users;
}

async function clearUserDependencies(
  admin: ReturnType<typeof createAdmin>,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  // actor_id is NOT NULL despite ON DELETE SET NULL in some schemas — delete rows.
  {
    const { error } = await admin.from('admin_action_logs').delete().in('actor_id', userIds);
    if (error) {
      throw new Error(`delete admin_action_logs: ${error.message}`);
    }
  }

  // Order matters for RESTRICT / NO ACTION FKs.
  const steps: Array<{ table: string; column: string }> = [
    { table: 'orders', column: 'manager_id' },
    { table: 'orders', column: 'contractor_id' },
    { table: 'contest_offers', column: 'contractor_id' },
    { table: 'job_applications', column: 'contractor_id' },
    { table: 'contests', column: 'manager_id' },
    { table: 'jobs', column: 'manager_id' },
  ];

  for (const { table, column } of steps) {
    const { error } = await admin.from(table).delete().in(column, userIds);
    if (error) {
      throw new Error(`delete ${table} by ${column}: ${error.message}`);
    }
  }

  // Nullable NO ACTION refs — clear rather than delete whole rows when possible.
  const nullUpdates: Array<{ table: string; column: string }> = [
    { table: 'questions', column: 'answered_by' },
    { table: 'certificates', column: 'verified_by' },
    { table: 'tender_documents', column: 'uploaded_by' },
    { table: 'conversations', column: 'last_message_sender_id' },
  ];

  for (const { table, column } of nullUpdates) {
    const { error } = await admin
      .from(table)
      .update({ [column]: null })
      .in(column, userIds);
    if (error) {
      console.warn(`  warn: null ${table}.${column}: ${error.message}`);
    }
  }
}

async function deleteOtherUsers(
  admin: ReturnType<typeof createAdmin>,
): Promise<string> {
  const users = await listAllUsers(admin);
  const keep = users.find(
    (u) => u.email?.toLowerCase() === KEEP_EMAIL.toLowerCase(),
  );
  if (!keep) {
    throw new Error(`Keep account missing: ${KEEP_EMAIL}`);
  }

  const toDelete = users.filter(
    (u) => u.email?.toLowerCase() !== KEEP_EMAIL.toLowerCase(),
  );
  console.log(`Keeping ${KEEP_EMAIL} (${keep.id})`);
  console.log(`Deleting ${toDelete.length} other auth users…`);

  await clearUserDependencies(
    admin,
    toDelete.map((u) => u.id),
  );

  for (const user of toDelete) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(`deleteUser ${user.email ?? user.id}: ${error.message}`);
    }
    console.log(`  deleted ${user.email}`);
  }

  return keep.id;
}

async function ensureAuthUser(
  admin: ReturnType<typeof createAdmin>,
  seed: SeedUser,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: seed.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: seed.firstName,
      last_name: seed.lastName,
      user_type: seed.userType,
      account_role: seed.accountRole,
    },
  });
  if (error || !data.user) {
    throw new Error(`createUser ${seed.email}: ${error?.message ?? 'no user'}`);
  }
  console.log(`  auth created: ${seed.email}`);
  return data.user.id;
}

async function ensureProfile(
  admin: ReturnType<typeof createAdmin>,
  userId: string,
  seed: SeedUser,
): Promise<void> {
  const { error } = await admin.from('user_profiles').upsert(
    {
      id: userId,
      user_type: seed.userType,
      first_name: seed.firstName,
      last_name: seed.lastName,
      platform_role: 'user',
      account_role: seed.accountRole,
      organization_type: seed.organizationType,
      profile_completed: true,
      onboarding_completed: true,
      is_verified: true,
      verification_document_paths: {},
      verification_document_reviews: {},
    },
    { onConflict: 'id' },
  );
  if (error) {
    throw new Error(`user_profiles ${seed.email}: ${error.message}`);
  }
}

async function ensureCompany(
  admin: ReturnType<typeof createAdmin>,
  userId: string,
  seed: SeedUser,
): Promise<void> {
  const { data: company, error } = await admin
    .from('companies')
    .insert({
      name: seed.companyName,
      type: seed.companyType,
      city: 'Warszawa',
      is_public: true,
      is_verified: true,
    })
    .select('id')
    .single();

  if (error || !company) {
    throw new Error(`companies ${seed.companyName}: ${error?.message ?? 'no row'}`);
  }

  const { error: linkError } = await admin.from('user_companies').insert({
    user_id: userId,
    company_id: company.id,
    role: 'owner',
    is_primary: true,
    is_active: true,
  });
  if (linkError) {
    throw new Error(`user_companies ${seed.email}: ${linkError.message}`);
  }
  console.log(`  company: ${seed.companyName}`);
}

async function main(): Promise<void> {
  console.log('Resetting TEST accounts on vestiqo-test…');
  console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  const admin = createAdmin();

  await deleteOtherUsers(admin);

  console.log('\nCreating seed accounts…');
  for (const seed of SEED_USERS) {
    console.log(`\n${seed.userType}: ${seed.email}`);
    const userId = await ensureAuthUser(admin, seed);
    await ensureProfile(admin, userId, seed);
    await ensureCompany(admin, userId, seed);
  }

  const remaining = await listAllUsers(admin);
  console.log('\nAuth users now:');
  for (const u of remaining.sort((a, b) =>
    (a.email ?? '').localeCompare(b.email ?? ''),
  )) {
    console.log(`  ${u.email}`);
  }
  console.log('\nDone. Password for new accounts: Test12!@');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
