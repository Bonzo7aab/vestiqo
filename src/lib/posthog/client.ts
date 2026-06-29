import type { CaptureResult } from 'posthog-js'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname)
}

export function isBrowserOnLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  return isLocalHostname(window.location.hostname)
}

/** Client analytics run only in production builds (see sentry.shared.ts). */
export function isPostHogClientEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) && process.env.NODE_ENV === 'production'
}

export function shouldInitializePostHogClient(): boolean {
  if (!isPostHogClientEnabled()) return false
  if (isBrowserOnLocalhost()) return false
  return true
}

function isLocalhostCaptureResult(event: CaptureResult): boolean {
  const host = event.properties?.['$host']
  if (typeof host === 'string' && isLocalHostname(host)) return true

  const currentUrl = event.properties?.['$current_url']
  if (typeof currentUrl === 'string') {
    try {
      return isLocalHostname(new URL(currentUrl).hostname)
    } catch {
      return false
    }
  }

  return false
}

/** Drop localhost traffic from the production PostHog project. */
export function posthogBeforeSend(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null
  if (process.env.NODE_ENV !== 'production') return event
  if (isBrowserOnLocalhost() || isLocalhostCaptureResult(event)) return null
  return event
}
