/**
 * Star rating input helpers (run: npx tsx tests/unit/star-rating-input.test.ts)
 */
import assert from 'node:assert/strict';
import {
  isStarFilled,
  nextRatingFromKey,
  ratingCaption,
  STAR_RATING_CAPTIONS,
  STAR_RATING_MAX,
  STAR_RATING_MIN,
  starAriaLabel,
} from '../../src/components/reviews/star-rating-utils';

assert.equal(STAR_RATING_MIN, 1);
assert.equal(STAR_RATING_MAX, 5);
assert.equal(STAR_RATING_CAPTIONS[1], 'Słabo');
assert.equal(STAR_RATING_CAPTIONS[5], 'Doskonale');

assert.equal(isStarFilled(3, 3), true);
assert.equal(isStarFilled(4, 3), false);
assert.equal(isStarFilled(1, 0), false);

assert.equal(ratingCaption(0), null);
assert.equal(ratingCaption(4), 'Dobrze');
assert.equal(ratingCaption(6), null);

assert.equal(starAriaLabel(1, true), '1 — Słabo (wymagane)');
assert.equal(starAriaLabel(5, false), '5 — Doskonale');
assert.match(starAriaLabel(3, true), /wymagane/);

assert.equal(nextRatingFromKey(3, 'ArrowRight'), 4);
assert.equal(nextRatingFromKey(3, 'ArrowUp'), 4);
assert.equal(nextRatingFromKey(3, 'ArrowLeft'), 2);
assert.equal(nextRatingFromKey(3, 'ArrowDown'), 2);
assert.equal(nextRatingFromKey(5, 'ArrowRight'), 5);
assert.equal(nextRatingFromKey(1, 'ArrowLeft'), 1);
assert.equal(nextRatingFromKey(0, 'ArrowRight'), 1);
assert.equal(nextRatingFromKey(3, 'Home'), 1);
assert.equal(nextRatingFromKey(3, 'End'), 5);
assert.equal(nextRatingFromKey(0, '4'), 4);
assert.equal(nextRatingFromKey(2, 'Enter'), null);
assert.equal(nextRatingFromKey(2, ' '), null);

console.log('star-rating-input tests passed');
