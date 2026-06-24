import * as Sentry from '@sentry/nextjs'
import { clientSentryOptions } from './sentry.shared'

Sentry.init({
  ...clientSentryOptions,
  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
