import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { Toaster } from '../components/ui/sonner'
import { AppProviders } from '../components/AppProviders'
import { HeaderWithSession } from '../components/HeaderWithSession'
import {
  getEffectiveUserContext,
  toImpersonationClientState,
} from '../lib/auth/effective-user'
import { LayoutProvider } from '../components/ConditionalFooter'
import { FilterProvider } from '../contexts/FilterContext'
import { JobsProvider } from '../contexts/JobsContext'
import { GlobalCommandPalette } from '../components/GlobalCommandPalette'
import { MobileMenuDock } from '../components/MobileMenuDock'
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration'
import { CookieConsentBanner } from '../components/CookieConsentBanner'
import { ScrollbarManager } from '../components/ScrollbarManager'
import { NavigationProvider } from '../contexts/NavigationContext'
import { RouteChangeLoader } from '../components/RouteChangeLoader'
import { NavigationRouteTracker } from '../components/NavigationRouteTracker'
import { BrowserAuthSync } from '../components/BrowserAuthSync'
import { DevThemeTools } from '../components/dev/DevThemeTools'
import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
  SEO_SITE_NAME,
  getAbsoluteUrl,
  getMetadataBaseUrl,
  getSeoOrigin,
} from '../lib/seo'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: `${SEO_SITE_NAME} - ${SEO_DEFAULT_TITLE}`,
    template: `%s | ${SEO_SITE_NAME}`,
  },
  description: SEO_DEFAULT_DESCRIPTION,
  metadataBase: getMetadataBaseUrl(),
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: getAbsoluteUrl('/'),
    siteName: SEO_SITE_NAME,
    title: `${SEO_SITE_NAME} - ${SEO_DEFAULT_TITLE}`,
    description: SEO_DEFAULT_DESCRIPTION,
    images: [
      {
        url: getAbsoluteUrl('/brand/vestiqo-logo.svg'),
        alt: `${SEO_SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SEO_SITE_NAME} - ${SEO_DEFAULT_TITLE}`,
    description: SEO_DEFAULT_DESCRIPTION,
    images: [getAbsoluteUrl('/brand/vestiqo-logo.svg')],
  },
  icons: {
    icon: [{ url: '/brand/vestiqo-mark.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/vestiqo-mark.svg' }],
  },
  robots: {
    index: true,
    follow: true,
  },
}

// Note: Next.js 15 enables React.StrictMode by default in development
// This causes useEffect to run twice and components to render twice
// This is NORMAL and helps catch bugs. It does NOT happen in production.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const appOrigin = getSeoOrigin()
  const websiteStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SEO_SITE_NAME,
    url: appOrigin,
    inLanguage: 'pl-PL',
  }
  const organizationStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_SITE_NAME,
    url: appOrigin,
    logo: getAbsoluteUrl('/brand/vestiqo-mark.svg'),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'kontakt@vestiqo.pl',
        areaServed: 'PL',
        availableLanguage: ['pl'],
      },
    ],
  }

  const effectiveContext = await getEffectiveUserContext()
  const impersonationState = toImpersonationClientState(effectiveContext)
  const impersonationSubjectId = impersonationState.isImpersonating
    ? impersonationState.subjectUserId
    : null

  return (
    <html lang="pl">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
        <ScrollbarManager />
        <ServiceWorkerRegistration />
        <AppProviders
          impersonationState={impersonationState}
          impersonationSubjectId={impersonationSubjectId}
        >
          <NavigationProvider>
            <RouteChangeLoader />
            <Suspense fallback={null}>
              <NavigationRouteTracker />
            </Suspense>
            <Suspense fallback={null}>
              <BrowserAuthSync />
            </Suspense>
            <Suspense fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Ładowanie...</p>
                </div>
              </div>
            }>
              <FilterProvider>
                <JobsProvider>
                  <LayoutProvider>
                    <HeaderWithSession />
                    <main className="min-h-[calc(100vh-12rem)] pb-20 lg:pb-0">
                      {children}
                    </main>
                    <MobileMenuDock />
                    <CookieConsentBanner />
                    <Toaster />
                    <GlobalCommandPalette />
                    <DevThemeTools />
                  </LayoutProvider>
                </JobsProvider>
              </FilterProvider>
            </Suspense>
          </NavigationProvider>
        </AppProviders>
      </body>
    </html>
  )
}
