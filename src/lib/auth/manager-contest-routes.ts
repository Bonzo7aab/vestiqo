/** Manager-only contest creation routes (not for contractors). */
const MANAGER_CONTEST_PATH_PREFIXES = [
  '/dodaj-konkurs',
  '/dodaj-przetarg',
  '/dodaj-zlecenie',
  '/wybor-typu-konkursu',
  '/tworzenie-przetargu',
] as const;

function pathnameFromPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  try {
    return new URL(trimmed, 'https://domio.local').pathname;
  } catch {
    return trimmed.split('?')[0]?.split('#')[0] ?? '/';
  }
}

export function isManagerContestPath(path: string): boolean {
  const pathname = pathnameFromPath(path);
  return MANAGER_CONTEST_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isRedirectForbiddenForContractor(path: string): boolean {
  const pathname = pathnameFromPath(path);
  return (
    pathname.startsWith('/panel-zarzadcy') ||
    pathname.startsWith('/administracja') ||
    isManagerContestPath(pathname)
  );
}
