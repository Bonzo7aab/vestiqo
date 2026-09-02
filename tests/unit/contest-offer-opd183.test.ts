/**
 * OPD-183 draft save with profile Wymogi attachments
 * (run: npx tsx tests/unit/contest-offer-opd183.test.ts)
 */
import assert from 'node:assert/strict';
import { buildFormalAttachmentFromProfile } from '../../src/lib/contest-offer/build-profile-formal-attachment';
import {
  createEmptyContestOfferForm,
  toSerializableContestOfferForm,
  type ResolvedContractorDocument,
} from '../../src/types/contest-offer';

function hasUndefined(value: unknown, path = 'root'): string | null {
  if (value === undefined) return path;
  if (value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const found = hasUndefined(value[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  for (const [key, nested] of Object.entries(value)) {
    const found = hasUndefined(nested, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function profileDoc(
  overrides: Partial<ResolvedContractorDocument> = {},
): ResolvedContractorDocument {
  return {
    requirementKey: 'insuranceOc',
    label: 'Polisa OC',
    path: 'contractors/u1/oc.pdf',
    fileName: 'oc.pdf',
    signedUrl: null,
    hint: null,
    missing: false,
    profileBlocked: false,
    ...overrides,
  };
}

const withoutSignedUrl = buildFormalAttachmentFromProfile(profileDoc());
assert.ok(withoutSignedUrl);
assert.equal('url' in withoutSignedUrl, false);
assert.equal('size' in withoutSignedUrl, false);

const withSignedUrl = buildFormalAttachmentFromProfile(
  profileDoc({ signedUrl: 'https://example.test/oc.pdf' }),
);
assert.ok(withSignedUrl);
assert.equal(withSignedUrl.url, 'https://example.test/oc.pdf');

const form = createEmptyContestOfferForm();
form.formalAttachments.insuranceOc = {
  id: 'profile-insuranceOc',
  name: 'oc.pdf',
  path: 'contractors/u1/oc.pdf',
  url: undefined,
  type: 'document',
  source: 'profile',
  requirementKey: 'insuranceOc',
  size: undefined,
};
form.extraAttachments.push({
  id: 'extra-1',
  name: 'wadium.pdf',
  path: 'bids/t1/wadium.pdf',
  url: undefined,
  type: 'document',
  source: 'extra',
  requirementKey: 'deposit',
});

const serializable = toSerializableContestOfferForm(form);
assert.deepEqual(serializable.stagedFiles, {});
assert.deepEqual(serializable.stagedQualificationFiles, {});
assert.equal('url' in (serializable.formalAttachments.insuranceOc ?? {}), false);
assert.equal('size' in (serializable.formalAttachments.insuranceOc ?? {}), false);
assert.equal('url' in (serializable.extraAttachments[0] ?? {}), false);

const undefinedPath = hasUndefined(serializable);
assert.equal(undefinedPath, null, `undefined at ${undefinedPath ?? ''}`);

const roundTrip = JSON.parse(JSON.stringify(serializable));
assert.deepEqual(roundTrip, serializable);

console.log('contest-offer-opd183.test.ts: ok');
