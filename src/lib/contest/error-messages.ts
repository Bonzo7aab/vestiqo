export const CONTEST_ERRORS = {
  notLoggedIn: 'Musisz być zalogowany, aby zapisać konkurs',
  missingCompany: 'Nie znaleziono firmy. Uzupełnij dane firmy w profilu.',
  prepareFailed: 'Nie udało się przygotować danych konkursu',
  saveFailed: 'Nie udało się zapisać konkursu. Spróbuj ponownie.',
} as const;

const KNOWN_CONTEST_ERRORS = new Set<string>(Object.values(CONTEST_ERRORS));

/** Map Postgres / English contest-save errors to Polish copy. Never returns technical text. */
export function translateContestError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return CONTEST_ERRORS.saveFailed;
  if (KNOWN_CONTEST_ERRORS.has(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();

  if (
    lower.includes('zalogowany') ||
    lower.includes('not authenticated') ||
    lower.includes('unauthorized')
  ) {
    return CONTEST_ERRORS.notLoggedIn;
  }

  if (
    lower.includes('must have a company') ||
    lower.includes('primary company') ||
    lower.includes('nie znaleziono firmy')
  ) {
    return CONTEST_ERRORS.missingCompany;
  }

  if (lower.includes('przygotować danych')) {
    return CONTEST_ERRORS.prepareFailed;
  }

  return CONTEST_ERRORS.saveFailed;
}

export function contestErrorFromUnknown(error: unknown): string {
  if (!error) return CONTEST_ERRORS.saveFailed;
  if (typeof error === 'string') return translateContestError(error);
  if (error instanceof Error) return translateContestError(error.message);
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return translateContestError(message);
  }
  return CONTEST_ERRORS.saveFailed;
}
