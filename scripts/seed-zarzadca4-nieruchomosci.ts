#!/usr/bin/env npx tsx
/**
 * Seed zarzadca4@vestiqo.pl (Administracja Wspólnoty) on vestiqo-test with
 * managed housing entities, buildings, and inspection calendar mock data (OPD-147).
 *
 * Usage: npx tsx scripts/seed-zarzadca4-nieruchomosci.ts
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const TEST_PROJECT_REF = 'hcnoqbnschbsxsjrbxao';
const PROD_PROJECT_REF = 'fabbgaqxsetnsppxegnx';

const EMAIL = 'zarzadca4@vestiqo.pl';
const PASSWORD = 'Test1!';

function assertTestEnvironment(url: string): void {
  if (url.includes(PROD_PROJECT_REF)) {
    throw new Error(`Refusing to seed production (${PROD_PROJECT_REF}).`);
  }
  if (!url.includes(TEST_PROJECT_REF) && !url.includes('localhost')) {
    console.warn(`Warning: URL may not be vestiqo-test: ${url}`);
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

async function findAuthUserId(
  admin: ReturnType<typeof createAdmin>,
  email: string,
): Promise<string | null> {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const users = data.users as Array<{ id: string; email?: string | null }>;
    const match = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;
    if (users.length < 200) return null;
    page += 1;
  }
}

async function ensureAuthUser(admin: ReturnType<typeof createAdmin>): Promise<string> {
  const existingId = await findAuthUserId(admin, EMAIL);
  if (existingId) {
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUser: ${error.message}`);
    console.log(`auth ok: ${EMAIL}`);
    return existingId;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: 'Zarzadca',
      last_name: '4',
      user_type: 'manager',
      account_role: 'property_manager',
    },
  });
  if (error || !data.user) {
    throw new Error(`createUser: ${error?.message ?? 'no user'}`);
  }
  console.log(`auth created: ${EMAIL}`);
  return data.user.id;
}

async function ensureProfile(
  admin: ReturnType<typeof createAdmin>,
  userId: string,
): Promise<void> {
  const { error } = await admin.from('user_profiles').upsert(
    {
      id: userId,
      user_type: 'manager',
      first_name: 'Zarzadca',
      last_name: '4',
      platform_role: 'user',
      account_role: 'property_manager',
      organization_type: 'wspólnota',
      profile_completed: true,
      onboarding_completed: true,
      is_verified: true,
      verification_document_paths: {},
      verification_document_reviews: {},
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`user_profiles: ${error.message}`);
  console.log('profile ok (property_manager / Administracja Wspólnoty)');
}

async function ensureCompany(
  admin: ReturnType<typeof createAdmin>,
  userId: string,
): Promise<string> {
  const { data: links } = await admin
    .from('user_companies')
    .select('company_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);

  if (links?.[0]?.company_id) {
    console.log(`company ok: ${links[0].company_id}`);
    return links[0].company_id as string;
  }

  const { data: company, error } = await admin
    .from('companies')
    .insert({
      name: 'Administracja Wspólnot Vestiqo 4',
      type: 'property_management',
      nip: '5272650004',
      city: 'Warszawa',
      address: 'ul. Marszałkowska 100',
      postal_code: '00-517',
      is_public: true,
      is_verified: true,
    })
    .select('id')
    .single();

  if (error || !company) {
    throw new Error(`companies insert: ${error?.message ?? 'no row'}`);
  }

  const { error: linkError } = await admin.from('user_companies').insert({
    user_id: userId,
    company_id: company.id,
    role: 'owner',
    is_primary: true,
    is_active: true,
  });
  if (linkError) throw new Error(`user_companies: ${linkError.message}`);

  console.log(`company created: ${company.id}`);
  return company.id as string;
}

interface EntitySeed {
  nip: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  buildings: Array<{
    name: string;
    technical: Record<string, unknown>;
    inspections: Array<{
      type: string;
      last: string;
      next: string;
    }>;
  }>;
}

const ENTITY_SEEDS: EntitySeed[] = [
  {
    nip: '5252448012',
    name: 'Wspólnota Mieszkaniowa „Królewska 4”',
    address: 'ul. Królewska 4',
    city: 'Warszawa',
    postal_code: '00-064',
    buildings: [
      {
        name: 'Budynek A — ul. Królewska 4A',
        technical: {
          above_ground_floors: 5,
          below_ground_floors: 1,
          roof_area_m2: 420,
          roof_type: 'flat_membrane',
          facade_area_m2: 1800,
          gas_connected_units: 28,
          gas_risers_count: 4,
          has_own_gas_boilerroom: false,
          chimney_openings_in_units: 56,
          chimney_shafts_above_roof: 8,
          chimney_duct_types: ['gravity_ventilation', 'flue_gas'],
          total_residential_units: 32,
          staircases_count: 2,
          lightning_control_joints: 6,
          heat_nodes_or_boilerrooms: 1,
          has_internal_hydrant_system: true,
        },
        inspections: [
          { type: 'gas_annual', last: '2025-09-12', next: '2026-09-12' },
          {
            type: 'chimney_ventilation_annual',
            last: '2025-10-03',
            next: '2026-10-03',
          },
          {
            type: 'general_building_annual',
            last: '2025-06-20',
            next: '2026-06-20',
          },
          {
            type: 'general_building_5y',
            last: '2022-05-15',
            next: '2027-05-15',
          },
          {
            type: 'electrical_lightning_5y',
            last: '2021-11-08',
            next: '2026-11-08',
          },
          {
            type: 'fire_hydrant_annual',
            last: '2025-08-01',
            next: '2026-08-01',
          },
        ],
      },
      {
        name: 'Budynek B — ul. Królewska 4B',
        technical: {
          above_ground_floors: 4,
          below_ground_floors: 0,
          roof_area_m2: 310,
          roof_type: 'sloped_tile',
          facade_area_m2: 1400,
          gas_connected_units: 20,
          gas_risers_count: 3,
          has_own_gas_boilerroom: true,
          chimney_openings_in_units: 40,
          chimney_shafts_above_roof: 6,
          chimney_duct_types: ['gravity_ventilation', 'smoke_solid_fuel'],
          total_residential_units: 24,
          staircases_count: 1,
          lightning_control_joints: 4,
          heat_nodes_or_boilerrooms: 1,
          has_internal_hydrant_system: false,
        },
        inspections: [
          { type: 'gas_annual', last: '2024-07-01', next: '2025-07-01' },
          {
            type: 'chimney_ventilation_annual',
            last: '2025-12-10',
            next: '2026-12-10',
          },
          {
            type: 'general_building_annual',
            last: '2025-03-18',
            next: '2026-03-18',
          },
          {
            type: 'general_building_5y',
            last: '2020-04-02',
            next: '2025-04-02',
          },
          {
            type: 'electrical_lightning_5y',
            last: '2023-09-30',
            next: '2028-09-30',
          },
          {
            type: 'fire_hydrant_annual',
            last: '2025-01-20',
            next: '2026-01-20',
          },
        ],
      },
    ],
  },
  {
    nip: '1137654321',
    name: 'Wspólnota Mieszkaniowa „Mokotów Park”',
    address: 'ul. Puławska 120',
    city: 'Warszawa',
    postal_code: '02-604',
    buildings: [
      {
        name: 'Etap I — Budynek frontowy',
        technical: {
          above_ground_floors: 7,
          below_ground_floors: 2,
          roof_area_m2: 650,
          roof_type: 'flat_tar_paper',
          facade_area_m2: 2600,
          gas_connected_units: 0,
          gas_risers_count: 0,
          has_own_gas_boilerroom: false,
          chimney_openings_in_units: 70,
          chimney_shafts_above_roof: 10,
          chimney_duct_types: ['gravity_ventilation'],
          total_residential_units: 56,
          staircases_count: 3,
          lightning_control_joints: 9,
          heat_nodes_or_boilerrooms: 2,
          has_internal_hydrant_system: true,
        },
        inspections: [
          { type: 'gas_annual', last: '', next: '' },
          {
            type: 'chimney_ventilation_annual',
            last: '2026-01-15',
            next: '2027-01-15',
          },
          {
            type: 'general_building_annual',
            last: '2025-11-01',
            next: '2026-11-01',
          },
          {
            type: 'general_building_5y',
            last: '2024-02-10',
            next: '2029-02-10',
          },
          {
            type: 'electrical_lightning_5y',
            last: '2024-06-01',
            next: '2029-06-01',
          },
          {
            type: 'fire_hydrant_annual',
            last: '2025-05-22',
            next: '2026-05-22',
          },
        ],
      },
    ],
  },
];

async function ensureEntitiesAndBuildings(
  admin: ReturnType<typeof createAdmin>,
  companyId: string,
): Promise<void> {
  for (const entitySeed of ENTITY_SEEDS) {
    const { data: existing } = await admin
      .from('managed_housing_entities')
      .select('id')
      .eq('manager_company_id', companyId)
      .eq('nip', entitySeed.nip)
      .maybeSingle();

    let entityId = existing?.id as string | undefined;

    if (!entityId) {
      const { data: inserted, error } = await admin
        .from('managed_housing_entities')
        .insert({
          manager_company_id: companyId,
          entity_type: 'wspólnota',
          nip: entitySeed.nip,
          name: entitySeed.name,
          address: entitySeed.address,
          city: entitySeed.city,
          postal_code: entitySeed.postal_code,
          regon: '000000000',
        })
        .select('id')
        .single();
      if (error || !inserted) {
        throw new Error(`entity insert ${entitySeed.nip}: ${error?.message}`);
      }
      entityId = inserted.id as string;
      console.log(`  entity created: ${entitySeed.name}`);
    } else {
      console.log(`  entity ok: ${entitySeed.name}`);
    }

    for (const buildingSeed of entitySeed.buildings) {
      const { data: existingBuilding } = await admin
        .from('managed_buildings')
        .select('id')
        .eq('managed_entity_id', entityId)
        .eq('name', buildingSeed.name)
        .maybeSingle();

      let buildingId = existingBuilding?.id as string | undefined;

      if (!buildingId) {
        const { data: building, error } = await admin
          .from('managed_buildings')
          .insert({
            managed_entity_id: entityId,
            name: buildingSeed.name,
            ...buildingSeed.technical,
          })
          .select('id')
          .single();
        if (error || !building) {
          throw new Error(`building insert ${buildingSeed.name}: ${error?.message}`);
        }
        buildingId = building.id as string;
        console.log(`    building created: ${buildingSeed.name}`);
      } else {
        const { error } = await admin
          .from('managed_buildings')
          .update({
            ...buildingSeed.technical,
            updated_at: new Date().toISOString(),
          })
          .eq('id', buildingId);
        if (error) {
          throw new Error(`building update ${buildingSeed.name}: ${error.message}`);
        }
        console.log(`    building ok: ${buildingSeed.name}`);
      }

      for (const inspection of buildingSeed.inspections) {
        const last = inspection.last.trim() ? inspection.last : null;
        const next = inspection.next.trim() ? inspection.next : null;

        const { error } = await admin.from('managed_building_inspections').upsert(
          {
            building_id: buildingId,
            inspection_type: inspection.type,
            last_inspected_at: last,
            next_inspected_at: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'building_id,inspection_type' },
        );
        if (error) {
          throw new Error(
            `inspection upsert ${buildingSeed.name}/${inspection.type}: ${error.message}`,
          );
        }
      }
      console.log(`      inspections upserted (6)`);
    }
  }
}

async function main(): Promise<void> {
  console.log('Seeding zarzadca4 + OPD-147 nieruchomosci mock data…');
  const admin = createAdmin();
  console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  const userId = await ensureAuthUser(admin);
  await ensureProfile(admin, userId);
  const companyId = await ensureCompany(admin, userId);
  await ensureEntitiesAndBuildings(admin, companyId);

  console.log('\nDone.');
  console.log(`Login: ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log('Role: Administracja Wspólnoty (property_manager)');
  console.log('Open: /konto?tab=nieruchomosci');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
