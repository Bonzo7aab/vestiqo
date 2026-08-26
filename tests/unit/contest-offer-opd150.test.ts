/**
 * OPD-150 contest offer error copy (run: npx tsx tests/unit/contest-offer-opd150.test.ts)
 */
import assert from 'node:assert/strict';
import {
  CONTEST_OFFER_ERRORS,
  contestOfferErrorFromUnknown,
  isContestOfferUniqueConflict,
  translateContestOfferError,
} from '../../src/lib/contest-offer/error-messages';

assert.equal(
  translateContestOfferError('Contractor must have a company to submit bids'),
  CONTEST_OFFER_ERRORS.missingCompany,
);

assert.equal(
  translateContestOfferError(
    'duplicate key value violates unique constraint "idx_contest_offers_one_per_company"',
  ),
  CONTEST_OFFER_ERRORS.uniqueConflict,
);

assert.equal(
  translateContestOfferError(
    'new row violates row-level security policy for table "contest_offers"',
  ),
  CONTEST_OFFER_ERRORS.rlsDenied,
);

assert.equal(
  translateContestOfferError(
    'Only plain objects, and a few built-ins, can be passed to Server Functions. Classes or null prototypes are not supported.',
  ),
  CONTEST_OFFER_ERRORS.serverActionFailed,
);

assert.equal(
  translateContestOfferError('An unexpected response was received from the server.'),
  CONTEST_OFFER_ERRORS.serverActionFailed,
);

assert.equal(
  translateContestOfferError(
    'Już złożyłeś ofertę na ten konkurs. Nie możesz złożyć więcej niż jednej oferty.',
  ),
  CONTEST_OFFER_ERRORS.alreadySubmitted,
);

assert.equal(
  contestOfferErrorFromUnknown(new Error('Failed to fetch contractor company')),
  CONTEST_OFFER_ERRORS.generic,
);

assert.equal(
  isContestOfferUniqueConflict({
    code: '23505',
    message: 'duplicate key value',
  }),
  true,
);

assert.equal(
  isContestOfferUniqueConflict({
    message:
      'duplicate key value violates unique constraint "idx_contest_offers_one_draft_per_company"',
  }),
  true,
);

assert.equal(isContestOfferUniqueConflict({ message: 'something else' }), false);

assert.equal(
  translateContestOfferError('Uzupełnij wykaz zrealizowanych prac'),
  CONTEST_OFFER_ERRORS.generic,
);

assert.equal(
  translateContestOfferError('Could not find the table \'public.contest_offers\' in the schema cache'),
  CONTEST_OFFER_ERRORS.generic,
);

assert.equal(
  translateContestOfferError(CONTEST_OFFER_ERRORS.abandonFailed),
  CONTEST_OFFER_ERRORS.abandonFailed,
);

console.log('contest-offer-opd150.test.ts: ok');
