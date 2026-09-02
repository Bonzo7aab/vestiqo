'use server';

import { STORAGE_BUCKETS } from '../storage/buckets';
import { requireAuthenticatedUser } from '../storage/auth';
import {
  deleteObjects,
  uploadObject,
} from '../storage/r2/operations';
import { normalizeStorageObjectPath } from '../storage/path-utils';
import {
  OC_POLICY_ALLOWED_EXTENSIONS,
  OC_POLICY_MAX_BYTES,
  OC_POLICY_SIGNED_URL_TTL_SEC,
  getOcPolicyAllowedFormatsLabel,
} from './contractor-account-constants';

function validateVerificationScanFile(file: File): void {
  if (file.size > OC_POLICY_MAX_BYTES) {
    throw new Error(
      `Plik jest zbyt duży. Maksymalny rozmiar: ${OC_POLICY_MAX_BYTES / (1024 * 1024)} MB`,
    );
  }

  const rawExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  const mime = file.type?.toLowerCase() ?? '';
  const mimeOk =
    mime === '' ||
    mime === 'application/pdf' ||
    mime.startsWith('image/jpeg') ||
    mime.startsWith('image/png') ||
    mime.startsWith('image/webp');
  const extOk = OC_POLICY_ALLOWED_EXTENSIONS.includes(
    rawExt as (typeof OC_POLICY_ALLOWED_EXTENSIONS)[number],
  );

  if (!extOk && !mimeOk) {
    throw new Error(
      `Nieobsługiwany format pliku. Dozwolone: ${getOcPolicyAllowedFormatsLabel()} (max ${OC_POLICY_MAX_BYTES / (1024 * 1024)} MB)`,
    );
  }
}

export async function uploadOcPolicyScan(userId: string, file: File): Promise<{ path: string }> {
  return uploadVerificationScan(userId, file, 'oc-policy');
}

export async function uploadProfessionalQualificationsScan(
  userId: string,
  file: File,
): Promise<{ path: string }> {
  return uploadVerificationScan(userId, file, 'professional-qualifications');
}

export async function uploadProfessionalQualificationTypeScan(
  userId: string,
  typeId: string,
  file: File,
): Promise<{ path: string }> {
  const { isAllowedQualificationTypeId } = await import(
    '../contractor/professional-qualification-documents'
  );
  if (!isAllowedQualificationTypeId(typeId)) {
    throw new Error('Nieznany typ uprawnienia');
  }
  return uploadVerificationScan(userId, file, `qualifications/${typeId}`);
}

async function uploadVerificationScan(
  userId: string,
  file: File,
  folder: string,
): Promise<{ path: string }> {
  await requireAuthenticatedUser(userId);
  validateVerificationScanFile(file);

  const rawExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf';
  const extension = rawExt ? rawExt.toLowerCase() : 'pdf';
  const safeExt = OC_POLICY_ALLOWED_EXTENSIONS.includes(
    extension as (typeof OC_POLICY_ALLOWED_EXTENSIONS)[number],
  )
    ? extension
    : 'pdf';

  const filePath = `${userId}/weryfikacja/${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${safeExt}`;

  await uploadObject(STORAGE_BUCKETS.VERIFICATION_DOCUMENTS, filePath, file);
  return { path: filePath };
}

export async function uploadZusCertificateScan(userId: string, file: File): Promise<{ path: string }> {
  return uploadVerificationScan(userId, file, 'zus-certificate');
}

export async function uploadTaxCertificateScan(userId: string, file: File): Promise<{ path: string }> {
  return uploadVerificationScan(userId, file, 'tax-certificate');
}

export async function uploadReferenceDocumentScan(userId: string, file: File): Promise<{ path: string }> {
  return uploadVerificationScan(userId, file, 'references');
}

export async function removeVerificationDocumentsFromBucket(paths: string[]): Promise<void> {
  const filtered = paths.map((p) => p.trim()).filter(Boolean);
  if (filtered.length === 0) return;

  for (const path of filtered) {
    const objectPath = normalizeStorageObjectPath(path, STORAGE_BUCKETS.VERIFICATION_DOCUMENTS);
    const userId = objectPath.split('/')[0];
    await requireAuthenticatedUser(userId);
  }

  try {
    await deleteObjects(STORAGE_BUCKETS.VERIFICATION_DOCUMENTS, filtered);
  } catch (error) {
    console.error('removeVerificationDocumentsFromBucket:', error);
  }
}

export async function getVerificationDocumentSignedUrl(path: string): Promise<string | null> {
  const { getAuthorizedViewUrl } = await import('../storage/authorized-download');
  return getAuthorizedViewUrl(path, OC_POLICY_SIGNED_URL_TTL_SEC);
}

/** @deprecated Use getVerificationDocumentSignedUrl */
export async function getOcPolicyScanSignedUrl(path: string): Promise<string | null> {
  return getVerificationDocumentSignedUrl(path);
}
