/**
 * OPD-171 NIP duplicate check (run: npx tsx tests/unit/registration-checks.test.ts)
 */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import { checkNipRegistrationStatus } from '../../src/lib/auth/registration-checks';

const TAKEN_NIP = '9512616683';
const COMPANY_ID = 'company-1';

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
  count?: number | null;
}

function createAdmin(tableResults: Record<string, QueryResult | QueryResult[]>): SupabaseClient<Database> {
  const callIndex: Record<string, number> = {};

  return {
    from(table: string) {
      const queued = tableResults[table];
      const results = Array.isArray(queued)
        ? queued
        : [queued ?? { data: [], error: null, count: 0 }];
      const idx = callIndex[table] ?? 0;
      callIndex[table] = idx + 1;
      const result = results[Math.min(idx, results.length - 1)] ?? {
        data: [],
        error: null,
        count: 0,
      };

      const builder: Record<string, unknown> = {};
      const passthrough = () => builder;
      builder.select = passthrough;
      builder.not = passthrough;
      builder.eq = passthrough;
      builder.then = (
        onFulfilled: (value: QueryResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(onFulfilled, onRejected);

      return builder;
    },
  } as unknown as SupabaseClient<Database>;
}

async function main(): Promise<void> {
  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: [], error: null },
        companies: { data: [], error: null },
        managed_housing_entities: { data: [], error: null },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'available');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: [{ nip: TAKEN_NIP }], error: null },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'taken');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: [], error: null },
        companies: { data: [{ id: COMPANY_ID, nip: TAKEN_NIP }], error: null },
        user_companies: { data: [], error: null, count: 1 },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'taken');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: [], error: null },
        companies: { data: [{ id: COMPANY_ID, nip: TAKEN_NIP }], error: null },
        user_companies: { data: [], error: null, count: 0 },
        managed_housing_entities: { data: [], error: null },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'available');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: [], error: null },
        companies: { data: [], error: null },
        managed_housing_entities: {
          data: [{ id: 'entity-1', nip: TAKEN_NIP, manager_company_id: COMPANY_ID }],
          error: null,
        },
        user_companies: { data: [], error: null, count: 1 },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'taken');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: [], error: null },
        companies: { data: [], error: null },
        managed_housing_entities: {
          data: [{ id: 'entity-1', nip: TAKEN_NIP, manager_company_id: COMPANY_ID }],
          error: null,
        },
        user_companies: { data: [], error: null, count: 0 },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'available');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: null, error: { message: 'permission denied' } },
        companies: { data: [], error: null },
        managed_housing_entities: { data: [], error: null },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'unavailable');
  }

  {
    const status = await checkNipRegistrationStatus(
      createAdmin({
        user_profiles: { data: null, error: { message: 'permission denied' } },
        companies: { data: [], error: null },
        managed_housing_entities: {
          data: [{ id: 'entity-1', nip: TAKEN_NIP, manager_company_id: COMPANY_ID }],
          error: null,
        },
        user_companies: { data: [], error: null, count: 1 },
      }),
      TAKEN_NIP,
    );
    assert.equal(status, 'taken');
  }

  console.log('registration-checks.test.ts: ok');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
