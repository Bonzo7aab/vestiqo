/**
 * Allegro-style public konkurs URLs (OPD-162).
 * Shape: `/konkurs/{slugified-title}-{uuidWithoutHyphens}`
 * Legacy `/konkurs/{uuid}` still parses and should redirect to the canonical slug.
 */

const POLISH_CHAR_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

const UUID_WITH_HYPHENS_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_HEX_RE = /^[0-9a-f]{32}$/i;
const SLUG_WITH_HEX_SUFFIX_RE = /-([0-9a-f]{32})$/i;

/** Max title slug length before the ID suffix (keeps URLs readable). */
const MAX_TITLE_SLUG_LENGTH = 80;

export function slugifyKonkursTitle(title: string): string {
  const lower = title.trim().toLowerCase();
  let out = '';

  for (const ch of lower) {
    if (POLISH_CHAR_MAP[ch]) {
      out += POLISH_CHAR_MAP[ch];
      continue;
    }
    if (/[a-z0-9]/.test(ch)) {
      out += ch;
      continue;
    }
    const decomposed = ch.normalize('NFD').replace(/\p{M}/gu, '');
    if (decomposed.length === 1 && /[a-z0-9]/i.test(decomposed)) {
      out += decomposed.toLowerCase();
      continue;
    }
    out += '-';
  }

  const collapsed = out
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_TITLE_SLUG_LENGTH)
    .replace(/-$/g, '');

  return collapsed || 'konkurs';
}

export function uuidToHex(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

export function hexToUuid(hex: string): string | null {
  if (!UUID_HEX_RE.test(hex)) return null;
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Extract contest/job UUID from a `/konkurs/[param]` segment. */
export function parseKonkursPathParam(param: string): string | null {
  const trimmed = param.trim();
  if (!trimmed) return null;

  if (UUID_WITH_HYPHENS_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const suffixMatch = trimmed.match(SLUG_WITH_HEX_SUFFIX_RE);
  if (suffixMatch?.[1]) {
    return hexToUuid(suffixMatch[1]);
  }

  if (UUID_HEX_RE.test(trimmed)) {
    return hexToUuid(trimmed);
  }

  return null;
}

export function buildKonkursSlug(title: string, id: string): string {
  const slug = slugifyKonkursTitle(title);
  return `${slug}-${uuidToHex(id)}`;
}

/** Canonical public path. Without title, emits legacy UUID path (page redirects when title loads). */
export function buildKonkursPath(id: string, title?: string | null): string {
  if (title?.trim()) {
    return `/konkurs/${buildKonkursSlug(title.trim(), id)}`;
  }
  return `/konkurs/${id}`;
}

export function isCanonicalKonkursPath(
  pathname: string,
  id: string,
  title: string,
): boolean {
  return pathname === buildKonkursPath(id, title);
}
