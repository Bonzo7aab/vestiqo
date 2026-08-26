export const CONTEST_DOCUMENT_MAX_FILES = 20;
export const CONTEST_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export interface ContestFileRejectionLike {
  file: { name: string };
  errors: ReadonlyArray<{ code: string; message: string }>;
}

export function formatContestFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} ${units[unitIndex]}`;
}

export function remainingContestDocumentSlots(
  pendingCount: number,
  keptCount: number,
  maxFiles = CONTEST_DOCUMENT_MAX_FILES,
): number {
  return Math.max(0, maxFiles - pendingCount - keptCount);
}

export function takeAcceptedContestFiles<T>(
  accepted: T[],
  remainingSlots: number,
): { filesToAdd: T[]; truncated: boolean } {
  if (remainingSlots <= 0) {
    return { filesToAdd: [], truncated: accepted.length > 0 };
  }
  return {
    filesToAdd: accepted.slice(0, remainingSlots),
    truncated: accepted.length > remainingSlots,
  };
}

export function contestDocumentRejectionMessage(
  rejection: ContestFileRejectionLike,
): string {
  const err = rejection.errors[0];
  const name = rejection.file.name;
  if (!err) {
    return `Nieprawidłowy plik "${name}"`;
  }
  switch (err.code) {
    case 'file-too-large':
      return `Plik "${name}" jest zbyt duży. Maksymalny rozmiar: 10 MB`;
    case 'file-too-small':
      return `Plik "${name}" jest pusty lub uszkodzony`;
    case 'file-invalid-type':
      return `Nieprawidłowy typ pliku "${name}". Dozwolone: PDF, DOC, DOCX, XLS, XLSX, obrazy`;
    case 'too-many-files':
      return contestDocumentCapMessage();
    default:
      return `Nie udało się dodać pliku "${name}"`;
  }
}

export function contestDocumentCapMessage(): string {
  return `Można dodać maksymalnie ${CONTEST_DOCUMENT_MAX_FILES} plików łącznie`;
}

export function contestDocumentTruncateWarning(added: number, attempted: number): string {
  return `Dodano ${added} z ${attempted} plików (maksymalnie ${CONTEST_DOCUMENT_MAX_FILES} łącznie)`;
}

export function parseContestDocumentSize(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function contestUploadFailureMessage(errors: unknown[]): string {
  const names = errors
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null || !('file' in entry)) {
        return null;
      }
      const file = (entry as { file?: unknown }).file;
      return typeof file === 'string' && file.trim() ? file : null;
    })
    .filter((name): name is string => Boolean(name));

  if (names.length > 0) {
    return `Nie udało się wgrać plików: ${names.join(', ')}. Konkurs nie został zapisany.`;
  }
  return 'Nie udało się wgrać dokumentów. Konkurs nie został zapisany.';
}
