import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { STORAGE_BUCKETS, type StorageBucket } from '../buckets';
import { getStoragePublicUrl } from '../public-url';
import { isPublicStorageBucket, isStorageObjectNotFound, normalizeStorageObjectPath } from '../path-utils';
import { getR2Client } from './client';

export async function uploadObject(
  bucket: StorageBucket,
  objectKey: string,
  file: File,
  options?: { cacheControl?: string },
): Promise<void> {
  const body = Buffer.from(await file.arrayBuffer());
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: file.type || 'application/octet-stream',
      CacheControl: options?.cacheControl ?? 'max-age=3600',
    }),
  );
}

export async function deleteObject(bucket: StorageBucket, objectKey: string): Promise<void> {
  const key = normalizeStorageObjectPath(objectKey, bucket);
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function deleteObjects(bucket: StorageBucket, objectKeys: string[]): Promise<void> {
  for (const objectKey of objectKeys) {
    if (!objectKey.trim()) continue;
    try {
      await deleteObject(bucket, objectKey);
    } catch (error) {
      if (!isStorageObjectNotFound(error)) {
        throw error;
      }
    }
  }
}

export async function objectExists(bucket: StorageBucket, objectKey: string): Promise<boolean> {
  const key = normalizeStorageObjectPath(objectKey, bucket);
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    if (isStorageObjectNotFound(error)) {
      return false;
    }
    throw error;
  }
}

export async function createPresignedGetUrl(
  bucket: StorageBucket,
  objectKey: string,
  expiresIn = 3600,
): Promise<string> {
  const key = normalizeStorageObjectPath(objectKey, bucket);
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn },
  );
}

function buildContentDisposition(filename: string): string {
  const safeAscii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'download';
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function createPresignedDownloadUrl(
  bucket: StorageBucket,
  objectKey: string,
  filename: string,
  expiresIn = 3600,
): Promise<string> {
  const key = normalizeStorageObjectPath(objectKey, bucket);
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: buildContentDisposition(filename),
    }),
    { expiresIn },
  );
}

export async function getObjectReadUrl(
  bucket: StorageBucket,
  objectKey: string,
  expiresIn = 3600,
): Promise<string> {
  const key = normalizeStorageObjectPath(objectKey, bucket);
  if (isPublicStorageBucket(bucket)) {
    return getStoragePublicUrl(bucket, key);
  }
  return createPresignedGetUrl(bucket, key, expiresIn);
}

export async function createSignedUrlSafe(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const bucket = resolveBucketFromPath(path);
  const objectPath = normalizeStorageObjectPath(path, bucket);

  try {
    if (isPublicStorageBucket(bucket)) {
      return getStoragePublicUrl(bucket, objectPath);
    }
    return await createPresignedGetUrl(bucket, objectPath, expiresIn);
  } catch (error) {
    if (!isStorageObjectNotFound(error)) {
      console.warn('[storage] createSignedUrl failed', {
        bucket,
        objectPath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

export async function createDownloadUrlSafe(
  path: string,
  filename: string,
  expiresIn = 3600,
): Promise<string | null> {
  const bucket = resolveBucketFromPath(path);
  const objectPath = normalizeStorageObjectPath(path, bucket);

  try {
    if (isPublicStorageBucket(bucket)) {
      return getStoragePublicUrl(bucket, objectPath);
    }
    return await createPresignedDownloadUrl(bucket, objectPath, filename, expiresIn);
  } catch (error) {
    if (!isStorageObjectNotFound(error)) {
      console.warn('[storage] createDownloadUrl failed', {
        bucket,
        objectPath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

function resolveBucketFromPath(path: string): StorageBucket {
  const normalized = path.replace(/^\/+/, '');
  if (normalized.includes('/contests/') && !normalized.includes('/zlecenia/')) {
    return STORAGE_BUCKETS.JOB_ATTACHMENTS;
  }
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

export { STORAGE_BUCKETS };
