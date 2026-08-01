/**
 * R2 bucket names.
 *
 * Production defaults match the live Cloudflare buckets. For Preview / local test,
 * set `R2_BUCKET_SUFFIX=-test` (and create matching `*-test` buckets), or override
 * individual names via `R2_BUCKET_*`. See docs/environments.md.
 */

function resolveBucketName(defaultName: string, envVar: string): string {
  const explicit = process.env[envVar]?.trim();
  if (explicit) return explicit;
  const suffix = process.env.R2_BUCKET_SUFFIX?.trim() ?? '';
  return `${defaultName}${suffix}`;
}

export const STORAGE_BUCKET_DEFAULTS = {
  JOB_ATTACHMENTS: 'job-attachments',
  BUILDING_IMAGES: 'building-images',
  BID_ATTACHMENTS: 'bid-attachments',
  VERIFICATION_DOCUMENTS: 'verification-documents',
} as const;

export const STORAGE_BUCKETS = {
  JOB_ATTACHMENTS: resolveBucketName(
    STORAGE_BUCKET_DEFAULTS.JOB_ATTACHMENTS,
    'R2_BUCKET_JOB_ATTACHMENTS',
  ),
  BUILDING_IMAGES: resolveBucketName(
    STORAGE_BUCKET_DEFAULTS.BUILDING_IMAGES,
    'R2_BUCKET_BUILDING_IMAGES',
  ),
  BID_ATTACHMENTS: resolveBucketName(
    STORAGE_BUCKET_DEFAULTS.BID_ATTACHMENTS,
    'R2_BUCKET_BID_ATTACHMENTS',
  ),
  VERIFICATION_DOCUMENTS: resolveBucketName(
    STORAGE_BUCKET_DEFAULTS.VERIFICATION_DOCUMENTS,
    'R2_BUCKET_VERIFICATION_DOCUMENTS',
  ),
};

/** Resolved R2 bucket name used with the S3-compatible API. */
export type StorageBucket = string;

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
