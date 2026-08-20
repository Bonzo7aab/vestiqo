/**
 * Ratings dashboard copy and visibility (run: npx tsx tests/unit/ratings-dashboard.test.tsx)
 */
import assert from 'node:assert/strict';
import {
  formatOpinionCountLabel,
  getNameInitials,
  getRatingsCopy,
  getReceivedReviewerLabel,
  getReviewSourceBadge,
  resolveDefaultRatingsTab,
  reviewSourceLabel,
  shouldShowEditAction,
  shouldShowRatingOverview,
  type RatingSummary,
} from '../../src/components/reviews/ratings-dashboard-utils';

const emptySummary: RatingSummary = {
  averageRating: 0,
  totalReviews: 0,
  ratingBreakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
};

const populatedSummary: RatingSummary = {
  averageRating: 4.5,
  totalReviews: 8,
  ratingBreakdown: { '5': 5, '4': 2, '3': 1, '2': 0, '1': 0 },
};

{
  const contractor = getRatingsCopy('contractor');
  assert.equal(contractor.title, 'Ocena');
  assert.match(contractor.subtitle, /Opinie o Twojej firmie/);
  assert.equal(contractor.issuedEmptyTitle, 'Brak wystawionych ocen');
  assert.equal(contractor.receivedEmptyTitle, 'Brak otrzymanych opinii');
  assert.equal(contractor.issuedEmptyCtaHref, '/panel-wykonawcy/projekty');
}

{
  const manager = getRatingsCopy('manager');
  assert.equal(manager.title, 'Ocena');
  assert.match(manager.subtitle, /konkursów/);
  assert.equal(manager.issuedEmptyTitle, 'Brak wystawionych ocen');
  assert.equal(manager.receivedEmptyTitle, 'Brak otrzymanych opinii');
  assert.equal(manager.issuedEmptyCtaHref, '/panel-zarzadcy/konkursy');
}

assert.equal(shouldShowRatingOverview(null), false);
assert.equal(shouldShowRatingOverview(emptySummary), false);
assert.equal(shouldShowRatingOverview(populatedSummary), true);

assert.equal(resolveDefaultRatingsTab('contractor', 0), 'received');
assert.equal(resolveDefaultRatingsTab('contractor', 4), 'received');
assert.equal(resolveDefaultRatingsTab('manager', 0), 'received');
assert.equal(resolveDefaultRatingsTab('manager', 2), 'issued');

assert.equal(shouldShowEditAction('issued'), true);
assert.equal(shouldShowEditAction('received'), false);

assert.equal(getReceivedReviewerLabel('manager', 'contractor'), 'Zarządca');
assert.equal(getReceivedReviewerLabel('client', 'contractor'), 'Klient prywatny');
assert.equal(getReceivedReviewerLabel('contractor', 'manager'), 'Wykonawca');

assert.equal(getReviewSourceBadge('tender-1', null), 'tender');
assert.equal(getReviewSourceBadge(null, 'job-1'), 'job');
assert.equal(getReviewSourceBadge(null, null), null);
assert.equal(reviewSourceLabel('tender'), 'Konkurs');
assert.equal(reviewSourceLabel('job'), 'Zlecenie');
assert.equal(reviewSourceLabel(null), null);

assert.equal(getNameInitials('Anna Nowak'), 'AN');
assert.equal(getNameInitials('Vestiqo'), 'VE');
assert.equal(getNameInitials('  '), '?');
assert.equal(formatOpinionCountLabel(8), 'Na podstawie 8 opinii');

console.log('ratings-dashboard tests passed');
