import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'
import {
  posthogBeforeSend,
  shouldInitializePostHogClient,
} from './src/lib/posthog/client'
import { clientSentryOptions } from './sentry.shared'

Sentry.init({
  ...clientSentryOptions,
  integrations: [Sentry.replayIntegration()],
})

if (shouldInitializePostHogClient()) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    defaults: '2026-01-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
    before_send: posthogBeforeSend,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
