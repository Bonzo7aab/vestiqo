/**
 * OPD-148 match helpers (run: npx tsx tests/unit/matched-contest.test.ts)
 */
import assert from 'node:assert/strict';
import {
  MATCHED_CONTEST_TITLE,
  buildMatchedContestMessage,
  excludeUserIds,
  resolveContestServiceMatchSlugs,
  subcategorySlugsForCategory,
} from '../../src/lib/notifications/matched-contest-match';
import { mapInAppNotificationPreferences } from '../../src/lib/notifications/opd41-preferences';
import {
  isContractorServicesGateExemptPath,
  isContractorServicesTab,
} from '../../src/lib/contractor-services-gate';

assert.deepEqual(
  resolveContestServiceMatchSlugs({ subcategorySlug: 'remonty-dachow-izolacje' }),
  ['remonty-dachow-izolacje'],
);

const parentSlugs = subcategorySlugsForCategory('roboty-budowlane-remonty');
assert.ok(parentSlugs.includes('remonty-dachow-izolacje'));
assert.deepEqual(
  resolveContestServiceMatchSlugs({ categorySlug: 'roboty-budowlane-remonty' }),
  parentSlugs,
);

assert.deepEqual(resolveContestServiceMatchSlugs({}), []);
assert.deepEqual(
  resolveContestServiceMatchSlugs({ subcategorySlug: 'not-a-real-slug', categorySlug: 'roboty-budowlane-remonty' }),
  parentSlugs,
);

assert.deepEqual(
  excludeUserIds(['a', 'b', 'c', 'a'], ['b', 'owner']),
  ['a', 'c', 'a'],
);

assert.equal(
  buildMatchedContestMessage('WM Kwiatowa', 'Dachy i izolacje'),
  'WM Kwiatowa opublikowała konkurs w kategorii Dachy i izolacje.',
);
assert.equal(MATCHED_CONTEST_TITLE, 'Konkurs dopasowany do Twoich usług');

const mapped = mapInAppNotificationPreferences(null);
assert.equal(mapped.contractorMatchedContestNotifications, true);

assert.equal(isContractorServicesTab('uslugi'), true);
assert.equal(isContractorServicesTab('services'), true);
assert.equal(isContractorServicesTab('dokumenty'), false);

assert.equal(isContractorServicesGateExemptPath('/konto', 'uslugi'), true);
assert.equal(isContractorServicesGateExemptPath('/konto', 'dokumenty'), false);
assert.equal(isContractorServicesGateExemptPath('/', null), false);
assert.equal(isContractorServicesGateExemptPath('/auth/callback', null), true);
assert.equal(isContractorServicesGateExemptPath('/regulamin', null), true);
assert.equal(isContractorServicesGateExemptPath('/panel-wykonawcy', null), false);

console.log('matched-contest tests passed');
