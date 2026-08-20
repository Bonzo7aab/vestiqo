'use server';

import { createClient } from '../supabase/server';
import { assertCanReadStorageObject } from './authorize-read';
import { STORAGE_BUCKETS } from './buckets';
import { resolveContestDocumentPath } from './contest-documents';
import { createPresignedDownloadUrl, createPresignedGetUrl } from './r2/operations';
import { normalizeStorageObjectPath, resolveStorageBucket } from './path-utils';
import { requireAuthenticatedUser } from './auth';

/**
 * Contest documentation may exist under modern `contests/` or legacy `tenders/`
 * keys inside job-attachments. Resolve the key that actually exists.
 */
async function resolveObjectKey(path: string): Promise<{
  bucket: ReturnType<typeof resolveStorageBucket>;
  objectKey: string;
}> {
  const bucket = resolveStorageBucket(path);
  const normalized = normalizeStorageObjectPath(path, bucket);

  if (bucket === STORAGE_BUCKETS.JOB_ATTACHMENTS && normalized.includes('/contests/')) {
    const resolved = await resolveContestDocumentPath(normalized);
    if (resolved) {
      return { bucket, objectKey: resolved };
    }
  }

  return { bucket, objectKey: normalized };
}

/**
 * Returns a short-lived presigned download URL after authorization checks (OPD-114).
 */
export async function getAuthorizedDownloadUrl(
  path: string,
  filename: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { id: callerId } = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { bucket, objectKey } = await resolveObjectKey(path);

  await assertCanReadStorageObject(supabase, callerId, path, bucket);

  try {
    return await createPresignedDownloadUrl(bucket, objectKey, filename, expiresIn);
  } catch {
    return null;
  }
}

/**
 * Returns a short-lived presigned view URL after authorization checks (OPD-114).
 */
export async function getAuthorizedViewUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { id: callerId } = await requireAuthenticatedUser();
  const supabase = await createClient();
  const { bucket, objectKey } = await resolveObjectKey(path);

  await assertCanReadStorageObject(supabase, callerId, path, bucket);

  try {
    return await createPresignedGetUrl(bucket, objectKey, expiresIn);
  } catch {
    return null;
  }
}
