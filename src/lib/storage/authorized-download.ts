'use server';

import { createClient } from '../supabase/server';
import { assertCanReadStorageObject } from './authorize-read';
import { createPresignedDownloadUrl, createPresignedGetUrl } from './r2/operations';
import { normalizeStorageObjectPath, resolveStorageBucket } from './path-utils';
import { requireAuthenticatedUser } from './auth';

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
  const bucket = resolveStorageBucket(path);
  const objectKey = normalizeStorageObjectPath(path, bucket);

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
  const bucket = resolveStorageBucket(path);
  const objectKey = normalizeStorageObjectPath(path, bucket);

  await assertCanReadStorageObject(supabase, callerId, path, bucket);

  try {
    return await createPresignedGetUrl(bucket, objectKey, expiresIn);
  } catch {
    return null;
  }
}
