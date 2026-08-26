import {
  formatContestFileSize,
  remainingContestDocumentSlots,
  takeAcceptedContestFiles,
  type ContestFileRejectionLike,
} from '../contest/contest-form-documents';

export const OFFER_DOCUMENT_MAX_FILES = 10;
export const OFFER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export {
  formatContestFileSize,
  remainingContestDocumentSlots,
  takeAcceptedContestFiles,
};

export type OfferDocumentKind = 'offerDocumentation' | 'formal' | 'deposit';

export const OFFER_DOCUMENTATION_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const OFFER_FORMAL_DOCUMENT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const OFFER_DEPOSIT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const ALLOWED_TYPES_LABEL: Record<OfferDocumentKind, string> = {
  offerDocumentation: 'PDF, DOC, DOCX, XLS, XLSX, obrazy',
  formal: 'PDF, DOC, DOCX lub obrazy',
  deposit: 'PDF lub obrazy',
};

export function remainingOfferDocumentSlots(
  pendingCount: number,
  keptCount: number,
): number {
  return remainingContestDocumentSlots(
    pendingCount,
    keptCount,
    OFFER_DOCUMENT_MAX_FILES,
  );
}

export function contestOfferDocumentRejectionMessage(
  rejection: ContestFileRejectionLike,
  kind: OfferDocumentKind = 'offerDocumentation',
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
      return `Nieprawidłowy typ pliku "${name}". Dozwolone: ${ALLOWED_TYPES_LABEL[kind]}`;
    case 'too-many-files':
      return kind === 'offerDocumentation'
        ? contestOfferDocumentCapMessage()
        : `Można dodać tylko jeden plik. Plik "${name}" nie został dodany`;
    default:
      return `Błąd przy dodawaniu pliku "${name}": ${err.message}`;
  }
}

export function contestOfferDocumentCapMessage(): string {
  return `Można dodać maksymalnie ${OFFER_DOCUMENT_MAX_FILES} plików łącznie`;
}

export function contestOfferDocumentTruncateWarning(
  added: number,
  attempted: number,
): string {
  return `Dodano ${added} z ${attempted} plików (maksymalnie ${OFFER_DOCUMENT_MAX_FILES} łącznie)`;
}

export function contestOfferUploadFailureMessage(errors: unknown[]): string {
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
    return `Nie udało się wgrać plików: ${names.join(', ')}. Oferta nie została zapisana.`;
  }
  return 'Nie udało się wgrać dokumentów. Oferta nie została zapisana.';
}
