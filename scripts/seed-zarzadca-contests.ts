#!/usr/bin/env npx tsx
/**
 * Seed contests (+ managed housing entities) for zarzadca1..3 on vestiqo-test.
 * Usage: npx tsx scripts/seed-zarzadca-contests.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.test-cloud.local') });

const TEST_PROJECT_REF = 'hcnoqbnschbsxsjrbxao';
const PROD_PROJECT_REF = 'fabbgaqxsetnsppxegnx';

const MANAGER_EMAILS = [
  'zarzadca1@vestiqo.pl',
  'zarzadca2@vestiqo.pl',
  'zarzadca3@vestiqo.pl',
] as const;

interface CategoryPair {
  categoryId: string;
  subcategoryId: string;
  label: string;
}

function assertTestEnvironment(url: string): void {
  if (url.includes(PROD_PROJECT_REF)) {
    throw new Error(`Refusing production (${PROD_PROJECT_REF}).`);
  }
  if (!url.includes(TEST_PROJECT_REF)) {
    throw new Error(`Refusing non-test URL: ${url}`);
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

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function isoDateOnly(days: number): string {
  return daysFromNow(days).toISOString().slice(0, 10);
}

const SELECTION_CRITERIA = {
  items: [
    { id: randomUUID(), name: 'Cena', weight: 60, type: 'price' as const },
    { id: randomUUID(), name: 'Doświadczenie', weight: 25, type: 'experience' as const },
    { id: randomUUID(), name: 'Termin', weight: 15, type: 'time' as const },
  ],
};

const FORMAL_REQUIREMENTS = {
  insuranceOc: true,
  insuranceOcMinAmount: 1000000,
  zusUsCertificates: true,
  references: true,
  referencesMinCount: 2,
  referencesYears: 3,
};

async function loadCategories(
  admin: ReturnType<typeof createAdmin>,
): Promise<CategoryPair[]> {
  const pairs: Array<{ parentSlug: string; childSlug: string; label: string }> = [
    {
      parentSlug: 'wykończenia-dekoracje',
      childSlug: 'malowanie',
      label: 'Malowanie klatek',
    },
    {
      parentSlug: 'instalacje-systemy-techniczne',
      childSlug: 'instalacje-elektryczne-oswietlenie',
      label: 'Instalacje elektryczne',
    },
    {
      parentSlug: 'sprzatanie-utrzymanie-czystosci',
      childSlug: 'biezace-sprzatanie',
      label: 'Sprzątanie',
    },
    {
      parentSlug: 'zielen-tereny-zewnetrzne',
      childSlug: 'pielegnacja-roslinnosci',
      label: 'Zieleń',
    },
    {
      parentSlug: 'zielen-tereny-zewnetrzne',
      childSlug: 'brukarstwo-naprawy-drog',
      label: 'Brukarstwo',
    },
    {
      parentSlug: 'sprzatanie-utrzymanie-czystosci',
      childSlug: 'mycie-okien-przeszklen',
      label: 'Mycie okien',
    },
  ];

  const result: CategoryPair[] = [];
  for (const pair of pairs) {
    const { data: parent } = await admin
      .from('job_categories')
      .select('id')
      .eq('slug', pair.parentSlug)
      .maybeSingle();
    const { data: child } = await admin
      .from('job_categories')
      .select('id')
      .eq('slug', pair.childSlug)
      .maybeSingle();
    if (!parent?.id || !child?.id) {
      console.warn(`  skip category pair ${pair.parentSlug}/${pair.childSlug}`);
      continue;
    }
    result.push({
      categoryId: parent.id,
      subcategoryId: child.id,
      label: pair.label,
    });
  }
  if (result.length === 0) {
    throw new Error('No category pairs found');
  }
  return result;
}

async function findUser(
  admin: ReturnType<typeof createAdmin>,
  email: string,
): Promise<{ userId: string; companyId: string; companyName: string }> {
  let page = 1;
  let userId: string | null = null;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    // listUsers error branch types users as `[]` (never[]); narrow via explicit type.
    const users = data.users as Array<{ id: string; email?: string | null }>;
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      userId = match.id;
      break;
    }
    if (users.length < 200) break;
    page += 1;
  }
  if (!userId) throw new Error(`User not found: ${email}`);

  const { data: link, error: linkError } = await admin
    .from('user_companies')
    .select('company_id, companies(id, name)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('is_primary', true)
    .maybeSingle();
  if (linkError || !link?.company_id) {
    throw new Error(`No company for ${email}: ${linkError?.message ?? 'missing'}`);
  }
  const company = link.companies as unknown as { id: string; name: string } | null;
  return {
    userId,
    companyId: link.company_id as string,
    companyName: company?.name ?? email,
  };
}

async function ensureEntities(
  admin: ReturnType<typeof createAdmin>,
  companyId: string,
  index: number,
): Promise<Array<{ id: string; name: string }>> {
  const desired = [
    {
      name: `Wspólnota Mieszkaniowa „Słoneczna ${index}”`,
      nip: `52510000${10 + index}`,
      address: `ul. Słoneczna ${10 + index}`,
      entity_type: 'wspólnota' as const,
    },
    {
      name: `Spółdzielnia Mieszkaniowa „Parkowa ${index}”`,
      nip: `52520000${10 + index}`,
      address: `ul. Parkowa ${20 + index}`,
      entity_type: 'spółdzielnia' as const,
    },
  ];

  const entities: Array<{ id: string; name: string }> = [];
  for (const item of desired) {
    const { data: existing } = await admin
      .from('managed_housing_entities')
      .select('id, name')
      .eq('manager_company_id', companyId)
      .eq('nip', item.nip)
      .maybeSingle();

    if (existing) {
      entities.push(existing);
      continue;
    }

    const { data, error } = await admin
      .from('managed_housing_entities')
      .insert({
        manager_company_id: companyId,
        entity_type: item.entity_type,
        nip: item.nip,
        name: item.name,
        address: item.address,
        city: 'Warszawa',
        postal_code: '00-001',
      })
      .select('id, name')
      .single();
    if (error || !data) {
      throw new Error(`entity insert ${item.name}: ${error?.message}`);
    }
    entities.push(data);
  }
  return entities;
}

interface ContestSpec {
  title: string;
  status: 'active' | 'evaluation' | 'awarded' | 'cancelled' | 'no_offers' | 'draft';
  isPublic: boolean;
  submissionOffsetDays: number;
  evaluationOffsetDays: number;
  completionOffsetDays: number;
  estimatedValue: number;
  projectDuration: string;
  winnerName?: string;
  offersCount?: number;
}

function contestSpecsFor(managerIndex: number, entityName: string): ContestSpec[] {
  return [
    {
      title: `[Z${managerIndex}] Remont klatki schodowej — ${entityName}`,
      status: 'active',
      isPublic: true,
      submissionOffsetDays: 14 + managerIndex,
      evaluationOffsetDays: 21 + managerIndex,
      completionOffsetDays: 60 + managerIndex,
      estimatedValue: 28000 + managerIndex * 1000,
      projectDuration: '30 dni',
      offersCount: 2,
    },
    {
      title: `[Z${managerIndex}] Wymiana oświetlenia LED — ${entityName}`,
      status: 'active',
      isPublic: true,
      submissionOffsetDays: 10 + managerIndex,
      evaluationOffsetDays: 17 + managerIndex,
      completionOffsetDays: 45 + managerIndex,
      estimatedValue: 15000 + managerIndex * 500,
      projectDuration: '14 dni',
      offersCount: 1,
    },
    {
      title: `[Z${managerIndex}] Sprzątanie części wspólnych — ${entityName}`,
      status: 'evaluation',
      isPublic: true,
      submissionOffsetDays: -3,
      evaluationOffsetDays: 7,
      completionOffsetDays: 30,
      estimatedValue: 42000,
      projectDuration: '12 miesięcy',
      offersCount: 4,
    },
    {
      title: `[Z${managerIndex}] Pielęgnacja zieleni — ${entityName}`,
      status: 'awarded',
      isPublic: true,
      submissionOffsetDays: -20,
      evaluationOffsetDays: -10,
      completionOffsetDays: 40,
      estimatedValue: 18000,
      projectDuration: 'sezon',
      winnerName: 'Firma Zielona Sp. z o.o.',
      offersCount: 3,
    },
    {
      title: `[Z${managerIndex}] Naprawa nawierzchni — ${entityName}`,
      status: 'no_offers',
      isPublic: true,
      submissionOffsetDays: -5,
      evaluationOffsetDays: 2,
      completionOffsetDays: 35,
      estimatedValue: 55000,
      projectDuration: '45 dni',
      offersCount: 0,
    },
    {
      title: `[Z${managerIndex}] Mycie elewacji (szkic) — ${entityName}`,
      status: 'draft',
      isPublic: false,
      submissionOffsetDays: 30,
      evaluationOffsetDays: 40,
      completionOffsetDays: 90,
      estimatedValue: 22000,
      projectDuration: '21 dni',
      offersCount: 0,
    },
  ];
}

async function seedContestsForManager(
  admin: ReturnType<typeof createAdmin>,
  email: string,
  managerIndex: number,
  categories: CategoryPair[],
): Promise<void> {
  console.log(`\n${email}`);
  const { userId, companyId, companyName } = await findUser(admin, email);
  console.log(`  company: ${companyName}`);

  const entities = await ensureEntities(admin, companyId, managerIndex);
  console.log(`  entities: ${entities.map((e) => e.name).join('; ')}`);

  // Avoid duplicating if already seeded
  const { count } = await admin
    .from('contests')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', userId);
  if ((count ?? 0) >= 6) {
    console.log(`  contests already present (${count}) — skip`);
    return;
  }

  let created = 0;
  for (let i = 0; i < contestSpecsFor(managerIndex, entities[0].name).length; i++) {
    const entity = entities[i % entities.length];
    const cat = categories[i % categories.length];
    const specs = contestSpecsFor(managerIndex, entity.name);
    const spec = specs[i];

    const { error } = await admin.from('contests').insert({
      title: spec.title,
      description: `Konkurs testowy (${spec.status}) dla ${email}. Zakres: ${cat.label}. Obiekt: ${entity.name}.`,
      category_id: cat.categoryId,
      subcategory_id: cat.subcategoryId,
      manager_id: userId,
      company_id: companyId,
      managed_entity_id: entity.id,
      location: { city: 'Warszawa', address: entity.name },
      address: `${entity.name}, Warszawa`,
      estimated_value: spec.estimatedValue,
      currency: 'PLN',
      status: spec.status,
      is_public: spec.isPublic,
      submission_deadline: daysFromNow(spec.submissionOffsetDays).toISOString(),
      evaluation_deadline: isoDateOnly(spec.evaluationOffsetDays),
      completion_date: isoDateOnly(spec.completionOffsetDays),
      project_duration: spec.projectDuration,
      published_at:
        spec.status === 'draft' ? null : daysFromNow(-7).toISOString(),
      selection_criteria: SELECTION_CRITERIA,
      formal_requirements: FORMAL_REQUIREMENTS,
      site_visit_type: 'optional',
      site_visit_notes: 'Umówić wizję lokalną z zarządcą.',
      payment_terms: { mode: 'standard_14' },
      warranty_period: 'min_24',
      guarantee_period: 'min_12',
      offers_count: spec.offersCount ?? 0,
      winner_name: spec.winnerName ?? null,
      awarded_at: spec.status === 'awarded' ? daysFromNow(-5).toISOString() : null,
    });

    if (error) {
      throw new Error(`contest insert "${spec.title}": ${error.message}`);
    }
    created += 1;
  }
  console.log(`  created ${created} contests`);
}

async function main(): Promise<void> {
  console.log('Seeding zarządca contests on vestiqo-test…');
  const admin = createAdmin();
  const categories = await loadCategories(admin);

  for (let i = 0; i < MANAGER_EMAILS.length; i++) {
    await seedContestsForManager(admin, MANAGER_EMAILS[i], i + 1, categories);
  }

  const { count } = await admin
    .from('contests')
    .select('id', { count: 'exact', head: true });
  console.log(`\nTotal contests now: ${count ?? 0}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
