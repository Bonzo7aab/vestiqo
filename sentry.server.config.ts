import * as Sentry from '@sentry/nextjs'
import { serverSentryOptions } from './sentry.shared'

Sentry.init(serverSentryOptions)
