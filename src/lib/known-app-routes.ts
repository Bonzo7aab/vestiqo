/**
 * First path segment for routes defined under `src/app`.
 * Anything else (e.g. /foo-bar) is redirected to `/` after session refresh.
 * Invalid dynamic IDs (e.g. /konkurs/…) are handled by `src/app/not-found.tsx`.
 */
export const ALLOWED_FIRST_SEGMENTS = new Set<string>([
  'administracja',
  'api',
  'auth',
  'aktualnosci',
  'co-nowego',
  'dodaj-konkurs',
  'dodaj-przetarg',
  'dodaj-zlecenie',
  'dla-wspolnot',
  'dla-wykonawcow',
  'faq',
  'kategorie-uslug',
  'konsultacja-eksperta',
  'kontakt',
  'o-nas',
  'pomoc-dla-wykonawcow',
  'pomoc-dla-zarzadcow',
  'konto',
  'logowanie',
  'panel-wykonawcy',
  'panel-zarzadcy',
  'polityka-prywatnosci',
  'powitanie',
  'program-pilotazowy',
  'pytania-konkursu',
  'regulamin',
  'rejestracja',
  'samouczek',
  'tworzenie-przetargu',
  'ustawienia-plikow-cookie',
  'uzupelnianie-profilu',
  'uzytkownik',
  'wdrozenie',
  'weryfikacja',
  'wiadomosci',
  'wybor-typu-konkursu',
  'wybor-typu-konta',
  'wybor-typu-zlecenia',
  'wykonawcy',
  'zapisane-zgloszenia',
  'zapomniane-haslo',
  'zarzadcy',
  'konkurs',
]);

export function isKnownAppRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return true;
  if (segment.startsWith('.')) return true;
  return ALLOWED_FIRST_SEGMENTS.has(segment);
}
