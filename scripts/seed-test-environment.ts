#!/usr/bin/env npx tsx
/**
 * Idempotent seed / repair for the cloud TEST Supabase project (vestiqo-test).
 *
 * Ensures E2E seeded users, company links, one managed housing entity, and at
 * least one active public contest exist. Refuses to run against production.
 *
 * Usage:
 *   npm run seed:test
 *   npx tsx scripts/seed-test-environment.ts
 *
 * Requires .env.local (or env) pointed at vestiqo-test:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test-cloud.local') });

const TEST_PROJECT_REF = 'hcnoqbnschbsxsjrbxao';
const PROD_PROJECT_REF = 'fabbgaqxsetnsppxegnx';

const SEEDED_MANAGER_EMAIL =
  process.env.E2E_SEEDED_MANAGER_EMAIL ?? 'zarzadca3@openpro.pl';
const SEEDED_MANAGER_PASSWORD =
  process.env.E2E_SEEDED_MANAGER_PASSWORD ?? 'Test1!';
const SEEDED_CONTRACTOR_EMAIL =
  process.env.E2E_SEEDED_CONTRACTOR_EMAIL ?? 'wykonawca3@openpro.pl';
const SEEDED_CONTRACTOR_PASSWORD =
  process.env.E2E_SEEDED_CONTRACTOR_PASSWORD ?? 'Test1!';

interface SeedUser {
  email: string;
  password: string;
  userType: 'manager' | 'contractor';
  firstName: string;
  lastName: string;
  accountRole: string;
  companyName: string;
  companyType: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: SEEDED_MANAGER_EMAIL,
    password: SEEDED_MANAGER_PASSWORD,
    userType: 'manager',
    firstName: 'Zarzadca',
    lastName: '3',
    accountRole: 'condo_board',
    companyName: 'Wspólnota Mieszkaniowa Zielona 3',
    companyType: 'wspólnota',
  },
  {
    email: SEEDED_CONTRACTOR_EMAIL,
    password: SEEDED_CONTRACTOR_PASSWORD,
    userType: 'contractor',
    firstName: 'Wykonawca',
    lastName: '3',
    accountRole: 'contractor',
    companyName: 'Firma Testowa Wykonawca 3',
    companyType: 'contractor',
  },
];

function assertTestEnvironment(url: string): void {
  if (url.includes(PROD_PROJECT_REF)) {
    throw new Error(
      `Refusing to seed production (${PROD_PROJECT_REF}). Point env at vestiqo-test.`
    );
  }
  if (!url.includes(TEST_PROJECT_REF) && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.warn(
      `Warning: URL does not look like vestiqo-test (${TEST_PROJECT_REF}): ${url}`
    );
  }
}

function createSeedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  assertTestEnvironment(url);

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function findAuthUserId(
  admin: ReturnType<typeof createSeedClient>,
  email: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    throw new Error(`listUsers failed: ${error.message}`);
  }
  const users = data.users as Array<{ id: string; email?: string | null }>;
  const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

async function ensureAuthUser(
  admin: ReturnType<typeof createSeedClient>,
  seed: SeedUser
): Promise<string> {
  const existingId = await findAuthUserId(admin, seed.email);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password: seed.password,
      email_confirm: true,
    });
    if (error) {
      throw new Error(`updateUser ${seed.email}: ${error.message}`);
    }
    console.log(`  auth user ok: ${seed.email}`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    user_metadata: {
      first_name: seed.firstName,
      last_name: seed.lastName,
      user_type: seed.userType,
    },
  });
  if (error || !data.user) {
    throw new Error(`createUser ${seed.email}: ${error?.message ?? 'no user'}`);
  }
  console.log(`  auth user created: ${seed.email}`);
  return data.user.id;
}

async function ensureProfile(
  admin: ReturnType<typeof createSeedClient>,
  userId: string,
  seed: SeedUser
): Promise<void> {
  const { error } = await admin.from('user_profiles').upsert(
    {
      id: userId,
      user_type: seed.userType,
      first_name: seed.firstName,
      last_name: seed.lastName,
      platform_role: 'user',
      account_role: seed.accountRole,
      profile_completed: true,
      onboarding_completed: true,
      contractor_services_completed: seed.userType === 'contractor',
      is_verified: true,
      verification_document_paths: {},
      verification_document_reviews: {},
    },
    { onConflict: 'id' }
  );
  if (error) {
    throw new Error(`user_profiles upsert ${seed.email}: ${error.message}`);
  }
}

async function ensureCompany(
  admin: ReturnType<typeof createSeedClient>,
  userId: string,
  seed: SeedUser
): Promise<string> {
  const { data: links } = await admin
    .from('user_companies')
    .select('company_id, companies(id, name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  const existingCompanyId = links?.[0]?.company_id as string | undefined;
  if (existingCompanyId) {
    if (seed.userType === 'contractor') {
      await admin
        .from('companies')
        .update({
          metadata: { service_subcategory_slugs: ['remonty-dachow-izolacje'] },
        })
        .eq('id', existingCompanyId);
    }
    console.log(`  company ok: ${seed.companyName} (${existingCompanyId})`);
    return existingCompanyId;
  }

  const { data: company, error } = await admin
    .from('companies')
    .insert({
      name: seed.companyName,
      type: seed.companyType,
      city: 'Warszawa',
      is_public: true,
      is_verified: true,
      ...(seed.userType === 'contractor'
        ? { metadata: { service_subcategory_slugs: ['remonty-dachow-izolacje'] } }
        : {}),
    })
    .select('id')
    .single();

  if (error || !company) {
    throw new Error(`companies insert ${seed.companyName}: ${error?.message ?? 'no row'}`);
  }

  const { error: linkError } = await admin.from('user_companies').insert({
    user_id: userId,
    company_id: company.id,
    role: 'owner',
    is_primary: true,
    is_active: true,
  });
  if (linkError) {
    throw new Error(`user_companies insert: ${linkError.message}`);
  }

  console.log(`  company created: ${seed.companyName}`);
  return company.id as string;
}

async function ensureManagedHousing(
  admin: ReturnType<typeof createSeedClient>,
  managerCompanyId: string
): Promise<void> {
  const { count } = await admin
    .from('managed_housing_entities')
    .select('id', { count: 'exact', head: true })
    .eq('manager_company_id', managerCompanyId);

  if ((count ?? 0) > 0) {
    console.log('  managed housing ok');
    return;
  }

  const { error } = await admin.from('managed_housing_entities').insert({
    manager_company_id: managerCompanyId,
    entity_type: 'wspólnota',
    nip: '5250000000',
    name: 'WM Test Zielona 3',
    address: 'ul. Zielona 3',
    city: 'Warszawa',
    postal_code: '00-001',
  });
  if (error) {
    throw new Error(`managed_housing_entities insert: ${error.message}`);
  }
  console.log('  managed housing created');
}

async function ensureActiveContest(
  admin: ReturnType<typeof createSeedClient>,
  managerId: string,
  companyId: string
): Promise<void> {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 21);

  const { data: active } = await admin
    .from('contests')
    .select('id, title')
    .eq('status', 'active')
    .eq('is_public', true)
    .gt('submission_deadline', new Date().toISOString())
    .limit(1);

  if (active && active.length > 0) {
    console.log(`  active contest ok: ${active[0].title}`);
    return;
  }

  // Prefer reactivating an existing manager contest over inserting a full row.
  const { data: candidates } = await admin
    .from('contests')
    .select('id, title')
    .eq('manager_id', managerId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (candidates && candidates.length > 0) {
    const { error } = await admin
      .from('contests')
      .update({
        status: 'active',
        is_public: true,
        submission_deadline: deadline.toISOString(),
        published_at: new Date().toISOString(),
      })
      .eq('id', candidates[0].id);
    if (error) {
      throw new Error(`contest reactivate: ${error.message}`);
    }
    console.log(`  contest reactivated: ${candidates[0].title}`);
    return;
  }

  const { data: category } = await admin
    .from('job_categories')
    .select('id')
    .is('parent_id', null)
    .limit(1)
    .maybeSingle();

  if (!category?.id) {
    throw new Error('No job_categories found — apply category migrations/seed first');
  }

  const { error } = await admin.from('contests').insert({
    title: 'Test: Remont klatki schodowej (seed)',
    description:
      'Konkurs testowy do QA na vestiqo-test. Można składać oferty i przechodzić flow bez danych produkcyjnych.',
    category_id: category.id,
    manager_id: managerId,
    company_id: companyId,
    location: { city: 'Warszawa', address: 'ul. Zielona 3' },
    address: 'ul. Zielona 3, Warszawa',
    estimated_value: 25000,
    currency: 'PLN',
    status: 'active',
    submission_deadline: deadline.toISOString(),
    is_public: true,
    published_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(`contest insert: ${error.message}`);
  }
  console.log('  active contest created');
}

async function printSummary(admin: ReturnType<typeof createSeedClient>): Promise<void> {
  const tables = [
    'companies',
    'contests',
    'jobs',
    'job_categories',
    'managed_housing_entities',
    'user_profiles',
  ] as const;

  console.log('\nCounts:');
  for (const table of tables) {
    const { count, error } = await admin
      .from(table)
      .select('id', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${table}: error (${error.message})`);
    } else {
      console.log(`  ${table}: ${count ?? 0}`);
    }
  }

  const { count: activeContests } = await admin
    .from('contests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  console.log(`  contests (active): ${activeContests ?? 0}`);
}

async function main(): Promise<void> {
  console.log('Seeding / repairing TEST environment…');
  const admin = createSeedClient();
  console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  let managerId = '';
  let managerCompanyId = '';

  for (const seed of SEED_USERS) {
    console.log(`\n${seed.userType}: ${seed.email}`);
    const userId = await ensureAuthUser(admin, seed);
    await ensureProfile(admin, userId, seed);
    const companyId = await ensureCompany(admin, userId, seed);
    if (seed.userType === 'manager') {
      managerId = userId;
      managerCompanyId = companyId;
    }
  }

  if (managerId && managerCompanyId) {
    console.log('\nManager fixtures:');
    await ensureManagedHousing(admin, managerCompanyId);
    await ensureActiveContest(admin, managerId, managerCompanyId);
  }

  await printSummary(admin);
  console.log('\nDone. Log in with seeded manager/contractor passwords from docs/environments.md');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
