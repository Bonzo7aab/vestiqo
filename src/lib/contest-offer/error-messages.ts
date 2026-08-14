export const CONTEST_OFFER_ERRORS = {
  alreadySubmitted:
    'Już złożyłeś ofertę na ten konkurs. Nie możesz złożyć więcej niż jednej oferty.',
  missingCompany:
    'Aby złożyć ofertę, uzupełnij dane firmy w profilu wykonawcy.',
  uniqueConflict:
    'Nie udało się zapisać oferty — istnieje już oferta lub szkic tej firmy w tym konkursie. Odśwież stronę i spróbuj ponownie.',
  rlsDenied:
    'Nie udało się zapisać oferty. Sprawdź, czy jesteś zalogowany jako wykonawca i spróbuj ponownie.',
  serverActionFailed:
    'Nie udało się wysłać oferty. Spróbuj ponownie za chwilę.',
  generic: 'Wystąpił błąd. Spróbuj ponownie.',
} as const;

export function isContestOfferUniqueConflict(error: {
  code?: string;
  message?: string;
} | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '23505') return true;
  const lower = `${error.message ?? ''}`.toLowerCase();
  if (!lower.includes('duplicate') && !lower.includes('unique')) return false;
  return (
    lower.includes('contest_offers') ||
    lower.includes('tender_bids') ||
    lower.includes('one_per_company') ||
    lower.includes('one_draft_per_company')
  );
}

function looksLikeEnglishTechnicalError(lower: string): boolean {
  return (
    lower.includes('violates') ||
    lower.includes('duplicate key') ||
    lower.includes('row-level security') ||
    lower.includes('only plain objects') ||
    lower.includes('unexpected response') ||
    lower.includes('server action') ||
    lower.includes('must have a company') ||
    lower.includes('failed to') ||
    lower.includes('not authenticated') ||
    lower.includes('unauthorized') ||
    lower.includes('permission denied') ||
    lower.includes('could not find') ||
    lower.includes('schema cache')
  );
}

/** Map Postgres / Next.js / English offer errors to the shared Polish copy. */
export function translateContestOfferError(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return CONTEST_OFFER_ERRORS.generic;

  const lower = trimmed.toLowerCase();

  if (
    lower.includes('już złożyłeś') ||
    lower.includes('oferta została już złożona')
  ) {
    return CONTEST_OFFER_ERRORS.alreadySubmitted;
  }

  if (lower.includes('must have a company') || lower.includes('primary company')) {
    return CONTEST_OFFER_ERRORS.missingCompany;
  }

  if (
    isContestOfferUniqueConflict({ message: trimmed }) ||
    ((lower.includes('duplicate') || lower.includes('unique')) &&
      (lower.includes('contest') || lower.includes('offer') || lower.includes('bid')))
  ) {
    return CONTEST_OFFER_ERRORS.uniqueConflict;
  }

  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('not allowed')
  ) {
    return CONTEST_OFFER_ERRORS.rlsDenied;
  }

  if (
    lower.includes('only plain objects') ||
    lower.includes('unexpected response was received from the server') ||
    lower.includes('failed to find server action') ||
    lower.includes('an unexpected response') ||
    (lower.includes('server action') && lower.includes('error'))
  ) {
    return CONTEST_OFFER_ERRORS.serverActionFailed;
  }

  if (looksLikeEnglishTechnicalError(lower)) {
    return CONTEST_OFFER_ERRORS.generic;
  }

  return trimmed;
}

export function contestOfferErrorFromUnknown(error: unknown): string {
  if (!error) return CONTEST_OFFER_ERRORS.generic;
  if (typeof error === 'string') return translateContestOfferError(error);
  if (error instanceof Error) return translateContestOfferError(error.message);
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return translateContestOfferError(message);
  }
  return CONTEST_OFFER_ERRORS.generic;
}
