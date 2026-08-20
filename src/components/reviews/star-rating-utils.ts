export const STAR_RATING_CAPTIONS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Słabo',
  2: 'Poniżej oczekiwań',
  3: 'W porządku',
  4: 'Dobrze',
  5: 'Doskonale',
};

export const STAR_RATING_MIN = 1;
export const STAR_RATING_MAX = 5;

export function isStarFilled(star: number, value: number): boolean {
  return star <= value;
}

export function starAriaLabel(star: number, required: boolean): string {
  const caption = STAR_RATING_CAPTIONS[star as 1 | 2 | 3 | 4 | 5];
  const base = caption ? `${star} — ${caption}` : `${star} gwiazdek`;
  return required ? `${base} (wymagane)` : base;
}

export function ratingCaption(rating: number): string | null {
  if (rating < STAR_RATING_MIN || rating > STAR_RATING_MAX) {
    return null;
  }
  return STAR_RATING_CAPTIONS[rating as 1 | 2 | 3 | 4 | 5];
}

export function nextRatingFromKey(current: number, key: string): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(STAR_RATING_MAX, Math.max(STAR_RATING_MIN, current + 1));
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(STAR_RATING_MIN, (current || STAR_RATING_MIN) - 1);
    case 'Home':
      return STAR_RATING_MIN;
    case 'End':
      return STAR_RATING_MAX;
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
      return Number(key);
    default:
      return null;
  }
}
