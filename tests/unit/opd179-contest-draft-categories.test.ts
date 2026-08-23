/**
 * OPD-179 contest draft category/subcategory round-trip
 * (run: npx tsx tests/unit/opd179-contest-draft-categories.test.ts)
 */
import assert from 'node:assert/strict';
import {
  categoryJoinFromUnknown,
  canonicalContestFormCategories,
} from '../../src/lib/contest/contest-form-category';

assert.deepEqual(categoryJoinFromUnknown(null), {});
assert.deepEqual(categoryJoinFromUnknown('Sprzątanie i Utrzymanie Czystości'), {
  name: 'Sprzątanie i Utrzymanie Czystości',
});
assert.deepEqual(
  categoryJoinFromUnknown({
    name: 'Sprzątanie i Utrzymanie Czystości',
    slug: 'sprzatanie-utrzymanie-czystosci',
  }),
  {
    name: 'Sprzątanie i Utrzymanie Czystości',
    slug: 'sprzatanie-utrzymanie-czystosci',
  },
);

const draftCategory = {
  name: 'Sprzątanie i Utrzymanie Czystości',
  slug: 'sprzatanie-utrzymanie-czystosci',
};
const draftSubcategory = {
  name: 'Sprzątanie hal garażowych i parkingów',
  slug: 'sprzatanie-garazy-parkingi',
};

const mapped = canonicalContestFormCategories(draftCategory, draftSubcategory);

assert.equal(mapped.category, 'Sprzątanie');
assert.equal(mapped.subcategory, 'Hale i parkingi');

const unknownNameWithSlug = canonicalContestFormCategories(
  { name: 'Legacy DB label that is not in config', slug: 'sprzatanie-utrzymanie-czystosci' },
  {
    name: 'Another unknown DB label',
    slug: 'sprzatanie-garazy-parkingi',
  },
);
assert.equal(unknownNameWithSlug.category, 'Sprzątanie');
assert.equal(unknownNameWithSlug.subcategory, 'Hale i parkingi');

const flattenedSubcategory = canonicalContestFormCategories(
  draftCategory,
  'Sprzątanie hal garażowych i parkingów',
);
assert.equal(flattenedSubcategory.category, 'Sprzątanie');
assert.equal(flattenedSubcategory.subcategory, 'Hale i parkingi');

const emptyCategories = canonicalContestFormCategories(null, null);
assert.equal(emptyCategories.category, '');
assert.equal(emptyCategories.subcategory, '');

console.log('opd179-contest-draft-categories tests passed');
