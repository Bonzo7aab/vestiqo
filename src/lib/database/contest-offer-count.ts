/**
 * Matches private.update_contest_offers_count (contests.offers_count):
 * counts submitted offers, excluding drafts and withdrawn (cancelled) bids.
 */
export function countsTowardContestOfferCount(status: string): boolean {
  return status !== 'draft' && status !== 'cancelled';
}

/** @deprecated Use countsTowardContestOfferCount */
export const countsTowardTenderBidsCount = countsTowardContestOfferCount;
