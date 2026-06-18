export const VERIFICATION_DOC_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

export function validateVerificationDocFile(file: File): void {
  if (file.size > VERIFICATION_DOC_MAX_BYTES) {
    throw new Error(
      `Plik jest zbyt duży (max ${VERIFICATION_DOC_MAX_BYTES / (1024 * 1024)} MB)`,
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
  const extOk = ALLOWED_EXT.has(rawExt);
  if (!extOk && !mimeOk) {
    throw new Error('Dozwolone formaty: PDF, JPG, PNG, WEBP');
  }
}

export function safeVerificationFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

export function buildVerificationDocumentPath(
  userId: string,
  documentKey: string,
  file: File,
): string {
  const rawExt = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? 'pdf' : 'pdf';
  const safeExt = ALLOWED_EXT.has(rawExt) ? rawExt : 'pdf';
  const safeName = safeVerificationFilename(file.name) || `upload.${safeExt}`;
  return `${userId}/weryfikacja/${documentKey}/${Date.now()}-${safeName}`;
}
