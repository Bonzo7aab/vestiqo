'use server';

import { STORAGE_BUCKETS } from './buckets';
import { requireAuthenticatedUser } from './auth';
import { normalizeStorageObjectPath } from './path-utils';
import { deleteObject, uploadObject, createPresignedGetUrl } from './r2/operations';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export interface UploadResult {
  url: string;
  path: string;
  type: 'image' | 'document';
}

export async function uploadJobAttachment(
  file: File,
  userId: string,
  jobId?: string,
): Promise<{ data: UploadResult | null; error: Error | null }> {
  try {
    await requireAuthenticatedUser(userId);

    const fileType = file.type.toLowerCase();
    const normalizedAllowedTypes = ALLOWED_TYPES.map((t) => t.toLowerCase());
    const isValidType =
      normalizedAllowedTypes.includes(fileType) ||
      (fileType === 'image/jpeg' && normalizedAllowedTypes.includes('image/jpg'));

    if (!isValidType) {
      return {
        data: null,
        error: new Error('Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX'),
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        data: null,
        error: new Error('Plik jest zbyt duży. Maksymalny rozmiar: 10MB'),
      };
    }

    const isImage = ALLOWED_IMAGE_TYPES.some(
      (type) => fileType.includes(type.split('/')[1]) || fileType === type,
    );
    const attachmentType: 'image' | 'document' = isImage ? 'image' : 'document';

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${timestamp}-${random}.${fileExt}`;
    const jobFolder = jobId || 'draft';
    const filePath = `${userId}/zlecenia/${jobFolder}/${fileName}`;

    await uploadObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, file);

    const signedUrl = await createPresignedGetUrl(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, 3600);

    return {
      data: {
        url: signedUrl,
        path: filePath,
        type: attachmentType,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error in uploadJobAttachment:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function uploadJobAttachments(
  files: File[],
  userId: string,
  jobId?: string,
): Promise<{ data: UploadResult[]; errors: unknown[] }> {
  const results: UploadResult[] = [];
  const errors: unknown[] = [];

  for (const file of files) {
    const { data, error } = await uploadJobAttachment(file, userId, jobId);
    if (error || !data) {
      errors.push({ file: file.name, error });
    } else {
      results.push(data);
    }
  }

  return { data: results, errors };
}

export async function deleteJobAttachment(
  imagePath: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const path = normalizeStorageObjectPath(imagePath, STORAGE_BUCKETS.JOB_ATTACHMENTS);
    const userId = path.split('/')[0];
    await requireAuthenticatedUser(userId);
    await deleteObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, path);
    return { success: true, error: null };
  } catch (err) {
    console.error('Error in deleteJobAttachment:', err);
    return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteJobAttachments(
  paths: string[],
): Promise<{ success: boolean; errors: unknown[] }> {
  const errors: unknown[] = [];

  for (const path of paths) {
    const { error } = await deleteJobAttachment(path);
    if (error) {
      errors.push({ path, error });
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
