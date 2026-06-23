export const STORAGE_BUCKETS = {
  JOB_ATTACHMENTS: 'job-attachments',
  BUILDING_IMAGES: 'building-images',
  BID_ATTACHMENTS: 'bid-attachments',
  VERIFICATION_DOCUMENTS: 'verification-documents',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Buckets served via public CDN / r2.dev base URL (not presigned).
 * Job attachments (contest docs, bids metadata paths) are private per OPD-114.
 */
export const PUBLIC_STORAGE_BUCKETS: ReadonlySet<StorageBucket> = new Set([
  STORAGE_BUCKETS.BUILDING_IMAGES,
]);

/** Buckets that require presigned URLs for read access. */
export const PRIVATE_STORAGE_BUCKETS: ReadonlySet<StorageBucket> = new Set([
  STORAGE_BUCKETS.BID_ATTACHMENTS,
  STORAGE_BUCKETS.VERIFICATION_DOCUMENTS,
]);
