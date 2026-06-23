'use server';

import { STORAGE_BUCKETS } from './buckets';
import { requireAuthenticatedUser } from './auth';
import { uploadObject, createPresignedGetUrl } from './r2/operations';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function uploadReviewImage(
  file: File,
  userId: string,
  reviewId: string,
): Promise<{ url: string | null; error: Error | null }> {
  try {
    await requireAuthenticatedUser(userId);

    const fileType = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      return { url: null, error: new Error('Dozwolone formaty: JPG, PNG, WEBP') };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { url: null, error: new Error('Maksymalny rozmiar pliku: 10 MB') };
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${userId}/reviews/${reviewId}/${fileName}`;

    await uploadObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, file);

    return {
      url: await createPresignedGetUrl(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, 3600),
      error: null,
    };
  } catch (err) {
    return {
      url: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}
