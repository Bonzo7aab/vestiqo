'use server';

import type { TenderContestDocumentMeta } from '../../types/tender-contest';
import { STORAGE_BUCKETS } from './buckets';
import { requireAuthenticatedUser } from './auth';
import { isStorageObjectNotFound } from './path-utils';
import { objectExists, uploadObject, createPresignedGetUrl } from './r2/operations';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
] as const;

function getFileExtension(fileName: string): string | null {
  const parts = fileName.split('.');
  if (parts.length < 2) return null;
  return parts.pop()?.toLowerCase() ?? null;
}

function isAllowedContestFile(file: File): boolean {
  const fileType = file.type.toLowerCase();
  const allowed = ALLOWED_TYPES.map((t) => t.toLowerCase());
  if (allowed.includes(fileType)) {
    return true;
  }

  const extension = getFileExtension(file.name);
  if (extension && (ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return true;
  }

  return false;
}

function inferDocumentType(fileName: string): TenderContestDocumentMeta['type'] {
  const lower = fileName.toLowerCase();
  if (lower.includes('rysun') || lower.includes('drawing')) return 'drawings';
  if (lower.includes('wymag') || lower.includes('stwior')) return 'requirements';
  if (lower.includes('spec') || lower.includes('koszt')) return 'specification';
  return 'other';
}

/** Legacy uploads used `{userId}/tenders/` — new uploads use `{userId}/contests/`. */
function contestDocumentPathCandidates(path: string): string[] {
  const normalized = path.replace(/^\/+/, '');
  if (normalized.includes('/contests/')) {
    const legacy = normalized.replace('/contests/', '/tenders/');
    return [normalized, legacy];
  }
  if (normalized.includes('/tenders/')) {
    const modern = normalized.replace('/tenders/', '/contests/');
    return [modern, normalized];
  }
  return [normalized];
}

/** Resolve a stored document path, trying modern `contests/` then legacy `tenders/` keys. */
export async function resolveContestDocumentPath(
  path: string,
): Promise<string | null> {
  for (const candidate of contestDocumentPathCandidates(path)) {
    try {
      const exists = await objectExists(STORAGE_BUCKETS.JOB_ATTACHMENTS, candidate);
      if (exists) return candidate;
    } catch (error) {
      if (!isStorageObjectNotFound(error)) {
        console.warn('[contest-documents] resolveContestDocumentPath failed', {
          path: candidate,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  return null;
}

export async function uploadContestDocument(
  file: File,
  userId: string,
  contestId?: string,
): Promise<{ data: TenderContestDocumentMeta | null; error: Error | null }> {
  try {
    await requireAuthenticatedUser(userId);

    if (!isAllowedContestFile(file)) {
      return {
        data: null,
        error: new Error(
          'Nieprawidłowy typ pliku. Dozwolone: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX, XLS, XLSX',
        ),
      };
    }

    if (file.size <= 0) {
      return { data: null, error: new Error('Plik jest pusty lub uszkodzony') };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { data: null, error: new Error('Plik jest zbyt duży. Maksymalny rozmiar: 10MB') };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const folder = contestId || 'draft';
    const filePath = `${userId}/contests/${folder}/${fileName}`;

    await uploadObject(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, file);

    const signedUrl = await createPresignedGetUrl(STORAGE_BUCKETS.JOB_ATTACHMENTS, filePath, 3600);

    return {
      data: {
        id: crypto.randomUUID(),
        name: file.name,
        url: signedUrl,
        path: filePath,
        type: inferDocumentType(file.name),
        size: file.size,
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

export async function uploadContestDocuments(
  files: File[],
  userId: string,
  contestId?: string,
): Promise<{ data: TenderContestDocumentMeta[]; errors: unknown[] }> {
  const results: TenderContestDocumentMeta[] = [];
  const errors: unknown[] = [];

  for (const file of files) {
    const { data, error } = await uploadContestDocument(file, userId, contestId);
    if (error || !data) {
      errors.push({ file: file.name, error });
    } else {
      results.push(data);
    }
  }

  return { data: results, errors };
}

/** @deprecated Use uploadContestDocument */
export const uploadTenderDocument = uploadContestDocument;

/** @deprecated Use uploadContestDocuments */
export const uploadTenderDocuments = uploadContestDocuments;
