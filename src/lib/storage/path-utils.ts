import {
  PUBLIC_STORAGE_BUCKETS,
  STORAGE_BUCKET_DEFAULTS,
  STORAGE_BUCKETS,
  type StorageBucket,
} from './buckets';

/** Resolved + default names so URL parsing works across prod and *-test. */
const ALL_BUCKETS = new Set<string>([
  ...Object.values(STORAGE_BUCKETS),
  ...Object.values(STORAGE_BUCKET_DEFAULTS),
]);

export function isStorageObjectNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const message = record.message?.toLowerCase() ?? '';
  return (
    record.name === 'NotFound' ||
    record.$metadata?.httpStatusCode === 404 ||
    message.includes('object not found') ||
    message.includes('not found')
  );
}

/** Strips bucket name or legacy Supabase / R2 URL prefix so only the object key remains. */
export function normalizeStorageObjectPath(path: string, bucket: StorageBucket): string {
  const trimmed = path.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith('http')) {
    const supabaseMarker = '/storage/v1/object/';
    const publicMarker = `${supabaseMarker}public/${bucket}/`;
    const signedMarker = `${supabaseMarker}sign/${bucket}/`;
    const authMarker = `${supabaseMarker}authenticated/${bucket}/`;
    for (const prefix of [publicMarker, signedMarker, authMarker, `${supabaseMarker}${bucket}/`]) {
      if (trimmed.includes(prefix)) {
        return trimmed.split(prefix)[1]?.split('?')[0] ?? trimmed;
      }
    }

    for (const knownBucket of ALL_BUCKETS) {
      const bucketSegment = `/${knownBucket}/`;
      if (trimmed.includes(bucketSegment)) {
        return trimmed.split(bucketSegment)[1]?.split('?')[0] ?? trimmed;
      }
    }
  }

  if (trimmed.startsWith(`${bucket}/`)) {
    return trimmed.slice(bucket.length + 1);
  }

  return trimmed.replace(/^\/+/, '');
}

export function resolveStorageBucket(path: string): StorageBucket {
  const normalized = path.replace(/^\/+/, '');
  // Contest documentation lives in job-attachments (`{userId}/contests/...`).
  if (normalized.includes('/contests/') && !normalized.includes('/zlecenia/')) {
    return STORAGE_BUCKETS.JOB_ATTACHMENTS;
  }
  // Offer (bid) attachments live in bid-attachments (`{userId}/tenders/...`).
  if (normalized.includes('/tenders/') && !normalized.includes('/zlecenia/')) {
    return STORAGE_BUCKETS.BID_ATTACHMENTS;
  }
  if (normalized.includes('/weryfikacja/')) {
    return STORAGE_BUCKETS.VERIFICATION_DOCUMENTS;
  }
  if (normalized.includes('/reviews/') || normalized.includes('/zlecenia/') || normalized.includes('/portfolio/')) {
    return STORAGE_BUCKETS.JOB_ATTACHMENTS;
  }
  return STORAGE_BUCKETS.VERIFICATION_DOCUMENTS;
}

export function assertUserOwnsObjectKey(userId: string, objectKey: string): void {
  const normalized = objectKey.replace(/^\/+/, '');
  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error('Brak uprawnień do tego pliku.');
  }
}

export function isPublicStorageBucket(bucket: StorageBucket): boolean {
  return PUBLIC_STORAGE_BUCKETS.has(bucket);
}
