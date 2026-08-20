import {
  PUBLIC_STORAGE_BUCKETS,
  STORAGE_BUCKETS,
  type StorageBucket,
} from './buckets';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, '');
}

/** Public CDN base for a resolved bucket name (env differs for prod vs *-test). */
function getPublicBaseForBucket(bucket: StorageBucket): string | undefined {
  if (bucket === STORAGE_BUCKETS.JOB_ATTACHMENTS) {
    return process.env.NEXT_PUBLIC_R2_PUBLIC_URL_JOB_ATTACHMENTS?.trim();
  }
  if (bucket === STORAGE_BUCKETS.BUILDING_IMAGES) {
    return process.env.NEXT_PUBLIC_R2_PUBLIC_URL_BUILDING_IMAGES?.trim();
  }
  return undefined;
}

/** Build a public object URL for buckets configured with an R2 public domain. */
export function getStoragePublicUrl(bucket: StorageBucket, objectKey: string): string {
  const trimmedKey = objectKey.trim();
  if (!trimmedKey) return trimmedKey;
  if (trimmedKey.startsWith('http://') || trimmedKey.startsWith('https://')) {
    return trimmedKey;
  }

  const base = getPublicBaseForBucket(bucket);
  if (!base) {
    throw new Error(`Public URL is not configured for bucket "${bucket}"`);
  }

  return `${trimTrailingSlash(base)}/${trimLeadingSlash(trimmedKey)}`;
}

export function isPublicStorageBucket(bucket: StorageBucket): boolean {
  return PUBLIC_STORAGE_BUCKETS.has(bucket);
}

export function resolveStorageBucketFromPath(path: string): StorageBucket {
  const normalized = path.replace(/^\/+/, '');
  if (normalized.includes('/contests/')) {
    return STORAGE_BUCKETS.JOB_ATTACHMENTS;
  }
  if (normalized.includes('/tenders/')) {
    return STORAGE_BUCKETS.BID_ATTACHMENTS;
  }
  if (normalized.includes('/reviews/') || normalized.includes('/zlecenia/') || normalized.includes('/portfolio/')) {
    return STORAGE_BUCKETS.JOB_ATTACHMENTS;
  }
  if (normalized.match(/\/[0-9a-f-]{36}\//)) {
    // building-images: {userId}/{buildingId}/...
    return STORAGE_BUCKETS.BUILDING_IMAGES;
  }
  return STORAGE_BUCKETS.VERIFICATION_DOCUMENTS;
}
