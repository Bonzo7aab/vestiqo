import type { VerificationState, AdminUserStatus } from './types';

export const VERIFICATION_STATUS_LABELS: Record<VerificationState, string> = {
  approved: 'Zweryfikowany',
  pending: 'Weryfikacja w toku',
  rejected: 'Odrzucony',
  unsubmitted: 'Wymaga weryfikacji',
};

export const ADMIN_USER_STATUS_LABELS: Record<AdminUserStatus, string> = {
  ...VERIFICATION_STATUS_LABELS,
  email_unconfirmed: 'Wymaga potwierdzenia email',
};

export const VERIFICATION_REJECTION_REASONS = [
  { id: 'invalid_nip', label: 'Błędny numer NIP' },
  { id: 'outdated_oc', label: 'Nieaktualna polisa OC' },
  { id: 'illegible_scan', label: 'Nieczytelny skan dokumentu' },
  { id: 'invalid_phone', label: 'Błędny numer telefonu' },
  { id: 'invalid_email', label: 'Błędny adres email' },
  { id: 'duplicate_account', label: 'Konto z takimi danymi już istnieje' },
  { id: 'other', label: 'Inne (wpisz ręcznie)' },
] as const;

export type VerificationRejectionReasonId = (typeof VERIFICATION_REJECTION_REASONS)[number]['id'];

/** Presets for per-document rejection in admin review. */
export const DOCUMENT_REJECTION_REASONS = [
  { id: 'illegible_scan', label: 'Nieczytelny skan dokumentu' },
  { id: 'outdated_oc', label: 'Nieaktualna polisa OC' },
  { id: 'wrong_document', label: 'Nieprawidłowy typ dokumentu' },
  { id: 'expired', label: 'Dokument wygasł / nieważny' },
  { id: 'missing_data', label: 'Brak wymaganych danych na dokumencie' },
  { id: 'invalid_nip', label: 'Niezgodny numer NIP' },
  { id: 'other', label: 'Inne (wpisz ręcznie)' },
] as const;

export type DocumentRejectionReasonId = (typeof DOCUMENT_REJECTION_REASONS)[number]['id'];

export function formatDocumentRejectionReason(
  reasonId: DocumentRejectionReasonId,
  customText?: string
): string {
  const preset = DOCUMENT_REJECTION_REASONS.find((r) => r.id === reasonId);
  if (!preset) {
    return customText?.trim() ?? '';
  }
  if (reasonId === 'other') {
    const detail = customText?.trim();
    return detail ? `${preset.label}: ${detail}` : preset.label;
  }
  return preset.label;
}

export function verificationStatusLabel(state: VerificationState): string {
  return VERIFICATION_STATUS_LABELS[state];
}

export function adminUserStatusLabel(state: AdminUserStatus): string {
  return ADMIN_USER_STATUS_LABELS[state];
}

export function formatVerificationRejectionReason(
  reasonId: VerificationRejectionReasonId,
  customText?: string
): string {
  const preset = VERIFICATION_REJECTION_REASONS.find(r => r.id === reasonId);
  if (!preset) {
    return customText?.trim() ?? '';
  }
  if (reasonId === 'other') {
    const detail = customText?.trim();
    return detail ? `${preset.label}: ${detail}` : preset.label;
  }
  return preset.label;
}

export function verificationStatusBadgeClass(state: VerificationState): string {
  switch (state) {
    case 'approved':
      return 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-700';
    case 'rejected':
      return 'border border-destructive/40 bg-destructive/10 text-destructive';
    case 'pending':
    case 'unsubmitted':
    default:
      return 'border border-amber-500/40 bg-amber-500/10 text-amber-800';
  }
}

export function adminUserStatusBadgeClass(state: AdminUserStatus): string {
  if (state === 'email_unconfirmed') {
    return 'border border-sky-500/40 bg-sky-500/10 text-sky-800';
  }

  return verificationStatusBadgeClass(state);
}
