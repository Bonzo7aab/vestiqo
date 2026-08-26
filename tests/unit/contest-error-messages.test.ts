/**
 * Contest creation error mapping (run: npx tsx tests/unit/contest-error-messages.test.ts)
 */
import assert from 'node:assert/strict';
import {
  CONTEST_ERRORS,
  contestErrorFromUnknown,
  translateContestError,
} from '../../src/lib/contest/error-messages';

assert.equal(
  translateContestError(
    'new row violates row-level security policy for table "contests"',
  ),
  CONTEST_ERRORS.saveFailed,
);

assert.equal(
  translateContestError('Could not find the table \'public.contests\' in the schema cache'),
  CONTEST_ERRORS.saveFailed,
);

assert.equal(
  contestErrorFromUnknown({
    message: 'duplicate key value violates unique constraint "contests_pkey"',
    code: '23505',
  }),
  CONTEST_ERRORS.saveFailed,
);

assert.equal(
  contestErrorFromUnknown(new Error('Failed to fetch categories')),
  CONTEST_ERRORS.saveFailed,
);

assert.equal(translateContestError(CONTEST_ERRORS.notLoggedIn), CONTEST_ERRORS.notLoggedIn);
assert.equal(translateContestError(CONTEST_ERRORS.missingCompany), CONTEST_ERRORS.missingCompany);
assert.equal(translateContestError(CONTEST_ERRORS.prepareFailed), CONTEST_ERRORS.prepareFailed);
assert.equal(translateContestError(''), CONTEST_ERRORS.saveFailed);
assert.equal(contestErrorFromUnknown(null), CONTEST_ERRORS.saveFailed);

console.log('contest-error-messages.test.ts: ok');
