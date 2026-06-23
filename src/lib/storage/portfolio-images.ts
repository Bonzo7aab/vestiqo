'use server';

import { createClient } from '../supabase/server';
import { STORAGE_BUCKETS } from './buckets';
import { requireAuthenticatedUser } from './auth';
import { normalizeStorageObjectPath } from './path-utils';
import { deleteObject, uploadObject, createPresignedGetUrl } from './r2/operations';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadResult {
  url: string;
  path: string;
  fileId: string;
}

export async function uploadPortfolioImage(
  file: File,
  userId: string,
  projectId: string,
): Promise<{ data: UploadResult | null; error: Error | null }> {
  try {
    await requireAuthenticatedUser(userId);
    const supabase = await createClient();

    const fileType = file.type.toLowerCase();
    const normalizedAllowedTypes = ALLOWED_IMAGE_TYPES.map((t) => t.toLowerCase());
    const isValidType =
      normalizedAllowedTypes.includes(fileType) ||
      (fileType === 'image/jpeg' && normalizedAllowedTypes.includes('image/jpg'));

    if (!isValidType) {
      return {
        data: null,
        error: new Error('Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WEBP, GIF'),
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        data: null,
        error: new Error('Plik jest zbyt duży. Maksymalny rozmiar: 10MB'),
      };
    }

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${random}.${fileExt}`;
    const filePath = `${userId}/portfolio/${projectId}/${fileName}`;

    await uploadObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, file);

    const { data: fileUploadData, error: fileUploadError } = await supabase
      .from('file_uploads')
      .insert({
        user_id: userId,
        file_name: fileName,
        original_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        file_type: 'portfolio',
        entity_type: 'portfolio_project',
        entity_id: projectId,
        is_public: true,
      })
      .select('id')
      .single();

    if (fileUploadError) {
      await deleteObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath);
      return {
        data: null,
        error: fileUploadError,
      };
    }

    return {
      data: {
        url: await createPresignedGetUrl(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, 3600),
        path: filePath,
        fileId: fileUploadData.id,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error in uploadPortfolioImage:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function uploadPortfolioImages(
  files: File[],
  userId: string,
  projectId: string,
): Promise<{ data: UploadResult[]; errors: unknown[] }> {
  const results: UploadResult[] = [];
  const errors: unknown[] = [];

  for (const file of files) {
    const { data, error } = await uploadPortfolioImage(file, userId, projectId);
    if (error || !data) {
      errors.push({ file: file.name, error });
    } else {
      results.push(data);
    }
  }

  return { data: results, errors };
}

export async function deletePortfolioImage(
  fileUploadId: string,
  imagePath: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = await createClient();
    const path = normalizeStorageObjectPath(imagePath, STORAGE_BUCKETS.JOB_ATTACHMENTS);
    const userId = path.split('/')[0];
    await requireAuthenticatedUser(userId);

    try {
      await deleteObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, path);
    } catch (storageError) {
      console.error('Error deleting portfolio image from storage:', storageError);
    }

    const { error: fileUploadError } = await supabase.from('file_uploads').delete().eq('id', fileUploadId);

    if (fileUploadError) {
      return { success: false, error: fileUploadError };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in deletePortfolioImage:', err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
