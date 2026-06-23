/**
 * Escapes user input embedded in PostgREST `.or()` / `.ilike` filter strings.
 * Prevents filter-syntax manipulation (not classic SQL injection).
 */
export function escapePostgrestFilterValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\./g, '');
}

/** Builds `col.ilike.%term%` with escaped term. */
export function ilikePattern(term: string): string {
  return `%${escapePostgrestFilterValue(term)}%`;
}
