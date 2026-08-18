import { STORAGE_BUCKETS, type StorageBucket } from '../storage/buckets';
import { resolveStorageBucket } from '../storage/path-utils';

export type StoragePathsByBucket = Map<StorageBucket, Set<string>>;

const STORAGE_PATH_MARKERS = ['/weryfikacja/', '/contests/', '/tenders/', '/zlecenia/', '/portfolio/', '/reviews/'];
const KNOWN_STORAGE_BUCKETS: readonly StorageBucket[] = Object.values(STORAGE_BUCKETS);

export function isLikelyStoragePathForDeletion(rawValue: string, userId: string): boolean {
  const trimmed = rawValue.trim();
  if (!trimmed) return false;

  const normalized = trimmed.replace(/^\/+/, '');
  if (normalized.startsWith(`${userId}/`)) return true;

  const lower = normalized.toLowerCase();
  if (STORAGE_PATH_MARKERS.some(marker => lower.includes(marker))) return true;

  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    if (lower.includes('/storage/v1/object/')) return true;
    return KNOWN_STORAGE_BUCKETS.some(bucket => lower.includes(`/${bucket.toLowerCase()}/`));
  }

  return false;
}

export function resolveStorageBucketForDeletion(rawPath: string): StorageBucket {
  const trimmed = rawPath.trim();
  for (const bucket of KNOWN_STORAGE_BUCKETS) {
    if (trimmed.startsWith(`${bucket}/`) || trimmed.includes(`/${bucket}/`)) {
      return bucket;
    }
  }
  return resolveStorageBucket(trimmed);
}

export function collectStoragePathsFromUnknown(
  rawValue: unknown,
  userId: string,
  output: Set<string>,
): void {
  if (typeof rawValue === 'string') {
    if (isLikelyStoragePathForDeletion(rawValue, userId)) {
      output.add(rawValue.trim());
    }
    return;
  }

  if (Array.isArray(rawValue)) {
    for (const item of rawValue) {
      collectStoragePathsFromUnknown(item, userId, output);
    }
    return;
  }

  if (rawValue && typeof rawValue === 'object') {
    for (const nestedValue of Object.values(rawValue as Record<string, unknown>)) {
      collectStoragePathsFromUnknown(nestedValue, userId, output);
    }
  }
}

export function groupStoragePathsByBucket(paths: Set<string>): StoragePathsByBucket {
  const grouped: StoragePathsByBucket = new Map();

  for (const path of paths) {
    if (!path) continue;
    const bucket = resolveStorageBucketForDeletion(path);
    const bucketPaths = grouped.get(bucket);
    if (bucketPaths) {
      bucketPaths.add(path);
      continue;
    }
    grouped.set(bucket, new Set([path]));
  }

  return grouped;
}
