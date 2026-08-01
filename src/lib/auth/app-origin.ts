/**
 * Public origin for absolute links (emails, redirects, OAuth callbacks).
 * Prefer explicit env; on Vercel Preview fall back to the deployment host.
 */
export function getPublicAppOrigin(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) {
    const host = vercelHost.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  return 'http://localhost:3000';
}
