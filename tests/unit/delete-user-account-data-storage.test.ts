import assert from 'node:assert/strict';
import {
  collectStoragePathsFromUnknown,
  isLikelyStoragePathForDeletion,
  resolveStorageBucketForDeletion,
} from '../../src/lib/auth/delete-user-account-data';
import { STORAGE_BUCKETS } from '../../src/lib/storage/buckets';

const userId = '123e4567-e89b-12d3-a456-426614174000';

assert.equal(isLikelyStoragePathForDeletion(`${userId}/weryfikacja/oc-policy/file.pdf`, userId), true);
assert.equal(isLikelyStoragePathForDeletion(`${userId}/portfolio/project-1/image.webp`, userId), true);
assert.equal(
  isLikelyStoragePathForDeletion(
    `https://cdn.example.com/${STORAGE_BUCKETS.BID_ATTACHMENTS}/${userId}/tenders/offer.pdf`,
    userId,
  ),
  true,
);
assert.equal(isLikelyStoragePathForDeletion('https://example.com/unrelated/file.pdf', userId), false);
assert.equal(isLikelyStoragePathForDeletion('just-a-note-not-a-path', userId), false);

assert.equal(
  resolveStorageBucketForDeletion(
    `https://cdn.example.com/${STORAGE_BUCKETS.BID_ATTACHMENTS}/${userId}/tenders/offer.pdf`,
  ),
  STORAGE_BUCKETS.BID_ATTACHMENTS,
);
assert.equal(
  resolveStorageBucketForDeletion(`${userId}/weryfikacja/tax-certificate/doc.pdf`),
  STORAGE_BUCKETS.VERIFICATION_DOCUMENTS,
);
assert.equal(
  resolveStorageBucketForDeletion(`${userId}/portfolio/project/file.jpg`),
  STORAGE_BUCKETS.JOB_ATTACHMENTS,
);

const collected = new Set<string>();
collectStoragePathsFromUnknown(
  {
    docs: [
      `${userId}/contests/spec.pdf`,
      {
        nested: {
          attachment: `https://cdn.example.com/${STORAGE_BUCKETS.JOB_ATTACHMENTS}/${userId}/zlecenia/offer.png`,
        },
      },
    ],
    unrelated: 'text-value',
  },
  userId,
  collected,
);

assert.deepEqual(
  [...collected].sort(),
  [
    `${userId}/contests/spec.pdf`,
    `https://cdn.example.com/${STORAGE_BUCKETS.JOB_ATTACHMENTS}/${userId}/zlecenia/offer.png`,
  ].sort(),
);

console.log('delete-user-account-data storage helpers tests passed');
