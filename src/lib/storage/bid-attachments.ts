'use server';

import { STORAGE_BUCKETS } from './buckets';
import { requireAuthenticatedUser } from './auth';
import { createPresignedGetUrl, uploadObject } from './r2/operations';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export interface BidUploadResult {
  url: string;
  path: string;
  type: 'image' | 'document';
}

export async function uploadBidAttachment(
  file: File,
  userId: string,
  tenderId: string,
): Promise<{ data: BidUploadResult | null; error: Error | null }> {
  try {
    await requireAuthenticatedUser(userId);

    const fileType = file.type.toLowerCase();
    const normalizedAllowed = ALLOWED_TYPES.map((t) => t.toLowerCase());
    const isValid =
      normalizedAllowed.includes(fileType) ||
      (fileType === 'image/jpeg' && normalizedAllowed.includes('image/jpg'));

    if (!isValid) {
      return {
        data: null,
        error: new Error('Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WEBP, PDF, DOC, DOCX'),
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
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/tenders/${tenderId}/${fileName}`;

    await uploadObject(STORAGE_BUCKETS.BID_ATTACHMENTS, filePath, file);
    const signedUrl = await createPresignedGetUrl(STORAGE_BUCKETS.BID_ATTACHMENTS, filePath, 3600);

    return {
      data: {
        path: filePath,
        url: signedUrl,
        type: attachmentType,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

export async function getBidAttachmentSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { getAuthorizedViewUrl } = await import('./authorized-download');
  return getAuthorizedViewUrl(path, expiresIn);
}

export async function getAttachmentDownloadUrl(
  path: string,
  filename: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { getAuthorizedDownloadUrl } = await import('./authorized-download');
  return getAuthorizedDownloadUrl(path, filename, expiresIn);
}
