interface UploadVerificationDocumentResult {
  path?: string;
  error?: string;
}

export async function uploadVerificationDocumentClient(
  documentKey: string,
  file: File,
): Promise<UploadVerificationDocumentResult> {
  const formData = new FormData();
  formData.append('documentKey', documentKey);
  formData.append('file', file);

  const response = await fetch('/api/weryfikacja/upload', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as UploadVerificationDocumentResult;

  if (!response.ok) {
    return { error: payload.error ?? 'Nie udało się przesłać pliku.' };
  }

  if (!payload.path) {
    return { error: 'Nie udało się przesłać pliku.' };
  }

  return { path: payload.path };
}
