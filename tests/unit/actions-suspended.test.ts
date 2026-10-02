/**
 * Account suspension flag (run: npx tsx tests/unit/actions-suspended.test.ts)
 */
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/database';
import {
  SUSPENDED_CONTEST_MESSAGE,
  SUSPENDED_OFFER_MESSAGE,
  isAccountActionsSuspended,
} from '../../src/lib/verification/actions-suspended';

function clientReturning(result: {
  data: { actions_suspended: boolean } | null;
  error: { message: string } | null;
}): SupabaseClient<Database> {
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    async maybeSingle() {
      return result;
    },
  };
  return {
    from() {
      return query;
    },
  } as unknown as SupabaseClient<Database>;
}

async function main(): Promise<void> {
  assert.match(SUSPENDED_CONTEST_MESSAGE, /zawieszone/i);
  assert.match(SUSPENDED_CONTEST_MESSAGE, /konkurs/i);
  assert.match(SUSPENDED_OFFER_MESSAGE, /zawieszone/i);
  assert.match(SUSPENDED_OFFER_MESSAGE, /ofert/i);

  const suspended = await isAccountActionsSuspended(
    clientReturning({ data: { actions_suspended: true }, error: null }),
    'user-1',
  );
  assert.equal(suspended, true);

  const active = await isAccountActionsSuspended(
    clientReturning({ data: { actions_suspended: false }, error: null }),
    'user-1',
  );
  assert.equal(active, false);

  const missingColumn = await isAccountActionsSuspended(
    clientReturning({ data: null, error: { message: 'column does not exist' } }),
    'user-1',
  );
  assert.equal(missingColumn, false);

  console.log('actions-suspended.test.ts ok');
}

void main();
