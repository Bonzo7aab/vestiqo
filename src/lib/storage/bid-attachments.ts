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
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
const ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx'] as const;
const ALLOWED_EXTENSIONS = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_DOCUMENT_EXTENSIONS,
] as const;

export interface BidUploadResult {
  url: string;
  path: string;
  type: 'image' | 'document';
}

function getFileExtension(fileName: string): string | null {
  const parts = fileName.split('.');
  if (parts.length < 2) return null;
  return parts.pop()?.toLowerCase() ?? null;
}

function isAllowedBidFile(file: File): boolean {
  const fileType = file.type.toLowerCase();
  const allowed = ALLOWED_TYPES.map((t) => t.toLowerCase());
  if (
    allowed.includes(fileType) ||
    (fileType === 'image/jpeg' && allowed.includes('image/jpg'))
  ) {
    return true;
  }

  const extension = getFileExtension(file.name);
  return Boolean(
    extension && (ALLOWED_EXTENSIONS as readonly string[]).includes(extension),
  );
}

function inferBidAttachmentType(file: File): 'image' | 'document' {
  const fileType = file.type.toLowerCase();
  if (
    ALLOWED_IMAGE_TYPES.some(
      (type) => fileType === type || fileType.includes(type.split('/')[1]),
    )
  ) {
    return 'image';
  }
  const extension = getFileExtension(file.name);
  if (
    extension &&
    (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)
  ) {
    return 'image';
  }
  return 'document';
}

export async function uploadBidAttachment(
  file: File,
  userId: string,
  tenderId: string,
): Promise<{ data: BidUploadResult | null; error: Error | null }> {
  try {
    await requireAuthenticatedUser(userId);

    if (!isAllowedBidFile(file)) {
      return {
        data: null,
        error: new Error(
          'Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS, XLSX',
        ),
      };
    }

    if (file.size <= 0) {
      return { data: null, error: new Error('Plik jest pusty lub uszkodzony') };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        data: null,
        error: new Error('Plik jest zbyt duży. Maksymalny rozmiar: 10MB'),
      };
    }

    const attachmentType = inferBidAttachmentType(file);
    const fileExt = getFileExtension(file.name) ?? 'bin';
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
