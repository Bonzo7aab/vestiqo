export type RatingsDashboardVariant = 'contractor' | 'manager';
export type RatingsDashboardTab = 'issued' | 'received';
export type ReviewSource = 'tender' | 'job';

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: { '5': number; '4': number; '3': number; '2': number; '1': number };
}

export interface RatingsCopy {
  title: string;
  subtitle: string;
  issuedEmptyTitle: string;
  issuedEmptyDescription: string;
  issuedEmptyCtaLabel: string;
  issuedEmptyCtaHref: string;
  receivedEmptyTitle: string;
  receivedEmptyDescription: string;
  overviewEmptyTitle: string;
  overviewEmptyDescription: string;
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    const single = parts[0] ?? '';
    return single.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

export function formatOpinionCountLabel(totalReviews: number): string {
  return `Na podstawie ${totalReviews} opinii`;
}

export function shouldShowRatingOverview(summary: RatingSummary | null): boolean {
  return summary !== null && summary.totalReviews > 0;
}

export function resolveDefaultRatingsTab(
  variant: RatingsDashboardVariant,
  writtenCount: number,
): RatingsDashboardTab {
  if (variant === 'contractor') {
    return 'received';
  }
  return writtenCount > 0 ? 'issued' : 'received';
}

export function getReceivedReviewerLabel(
  reviewerType: string,
  variant: RatingsDashboardVariant,
): string {
  if (reviewerType === 'manager') {
    return 'Zarządca';
  }
  return variant === 'contractor' ? 'Klient prywatny' : 'Wykonawca';
}

export function getReviewSourceBadge(
  tenderId: string | null | undefined,
  jobId: string | null | undefined,
): ReviewSource | null {
  if (tenderId) {
    return 'tender';
  }
  if (jobId) {
    return 'job';
  }
  return null;
}

export function reviewSourceLabel(source: ReviewSource | null): string | null {
  if (source === 'tender') {
    return 'Konkurs';
  }
  if (source === 'job') {
    return 'Zlecenie';
  }
  return null;
}

export function shouldShowEditAction(tab: RatingsDashboardTab): boolean {
  return tab === 'issued';
}

export function getRatingsCopy(variant: RatingsDashboardVariant): RatingsCopy {
  if (variant === 'contractor') {
    return {
      title: 'Ocena',
      subtitle: 'Opinie o Twojej firmie oraz oceny wystawione po zakończonej współpracy.',
      issuedEmptyTitle: 'Brak wystawionych ocen',
      issuedEmptyDescription:
        'Oceń konkurs po ukończeniu projektu w sekcji Projekty — pomoże to innym wykonawcom.',
      issuedEmptyCtaLabel: 'Przejdź do projektów',
      issuedEmptyCtaHref: '/panel-wykonawcy/projekty',
      receivedEmptyTitle: 'Brak otrzymanych opinii',
      receivedEmptyDescription: 'Twoja firma nie ma jeszcze żadnych opinii od klientów.',
      overviewEmptyTitle: 'Brak ocen firmy',
      overviewEmptyDescription:
        'Gdy klienci ocenią współpracę z Tobą, średnia pojawi się w tym miejscu.',
    };
  }

  return {
    title: 'Ocena',
    subtitle:
      'Opinie o Twojej firmie oraz oceny współpracy wystawione wykonawcom po rozstrzygnięciu konkursów.',
    issuedEmptyTitle: 'Brak wystawionych ocen',
    issuedEmptyDescription:
      'Oceń współpracę po wyborze oferty w sekcji Konkursy — pomoże to innym zarządcom.',
    issuedEmptyCtaLabel: 'Przejdź do konkursów',
    issuedEmptyCtaHref: '/panel-zarzadcy/konkursy',
    receivedEmptyTitle: 'Brak otrzymanych opinii',
    receivedEmptyDescription:
      'Twoja firma nie ma jeszcze opinii od wykonawców. Pojawią się tu po zakończonej współpracy.',
    overviewEmptyTitle: 'Brak ocen firmy',
    overviewEmptyDescription:
      'Gdy wykonawcy ocenią współpracę z Tobą, średnia pojawi się w tym miejscu.',
  };
}
