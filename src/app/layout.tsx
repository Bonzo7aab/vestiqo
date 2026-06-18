import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { Toaster } from '../components/ui/sonner'
import AuthProvider from '../contexts/AuthContext'
import { HeaderWithSession } from '../components/HeaderWithSession'
import { LayoutProvider } from '../components/ConditionalFooter'
import { FilterProvider } from '../contexts/FilterContext'
import { JobsProvider } from '../contexts/JobsContext'
import { GlobalCommandPalette } from '../components/GlobalCommandPalette'
import { MobileMenuDock } from '../components/MobileMenuDock'
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration'
import { CookieConsentBanner } from '../components/CookieConsentBanner'
import { ScrollbarManager } from '../components/ScrollbarManager'
import { NavigationProvider } from '../contexts/NavigationContext'
import { NavigationProgressBar } from '../components/NavigationProgressBar'
import { BrowserAuthSync } from '../components/BrowserAuthSync'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Vestiqo - Platforma dla Zarządców i Wykonawców',
  description: 'Platforma łącząca zarządców nieruchomości z wykwalifikowanymi wykonawcami',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: '/',
    siteName: 'Vestiqo',
    title: 'Vestiqo - Platforma dla Zarządców i Wykonawców',
    description: 'Platforma łącząca zarządców nieruchomości z wykwalifikowanymi wykonawcami',
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
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <ScrollbarManager />
        <ServiceWorkerRegistration />
        <AuthProvider>
          <NavigationProvider>
            <NavigationProgressBar />
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
                  </LayoutProvider>
                </JobsProvider>
              </FilterProvider>
            </Suspense>
          </NavigationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
