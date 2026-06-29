import { PostHog } from 'posthog-node'

let posthogClient: PostHog | null = null

function isPostHogServerEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) && process.env.NODE_ENV === 'production'
}

export function getPostHogClient(): PostHog | null {
  if (!isPostHogServerEnabled()) return null

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return posthogClient
}
