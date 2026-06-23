/** Escapes text for safe HTML insertion. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes a value for use inside an HTML attribute (e.g. href, data-*). */
export function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replace(/`/g, '&#96;');
}
