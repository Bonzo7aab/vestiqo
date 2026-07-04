import type { Metadata } from 'next'
import { getPublicAppOrigin } from './auth/app-origin'

export const SEO_SITE_NAME = 'Vestiqo'
export const SEO_DEFAULT_TITLE = 'Platforma dla zarządców i wykonawców nieruchomości'
export const SEO_DEFAULT_DESCRIPTION =
  'Vestiqo łączy zarządców nieruchomości ze sprawdzonymi wykonawcami i usprawnia konkursy ofert na usługi remontowe oraz utrzymaniowe.'
export const SEO_DEFAULT_OG_IMAGE_PATH = '/brand/vestiqo-logo.svg'

const FALLBACK_APP_ORIGIN = 'http://localhost:3000'

export function getSeoOrigin(): string {
  return getPublicAppOrigin() || FALLBACK_APP_ORIGIN
}

export function getMetadataBaseUrl(): URL {
  try {
    return new URL(getSeoOrigin())
  } catch {
    return new URL(FALLBACK_APP_ORIGIN)
  }
}

export function getAbsoluteUrl(pathname: string = '/'): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  return new URL(normalizedPathname, getMetadataBaseUrl()).toString()
}

interface BuildPageMetadataInput {
  title: string
  description: string
  pathname: string
  type?: 'website' | 'article'
  keywords?: string[]
}

export function buildPageMetadata({
  title,
  description,
  pathname,
  type = 'website',
  keywords,
}: BuildPageMetadataInput): Metadata {
  const url = getAbsoluteUrl(pathname)
  const imageUrl = getAbsoluteUrl(SEO_DEFAULT_OG_IMAGE_PATH)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: pathname,
    },
    openGraph: {
      type,
      locale: 'pl_PL',
      url,
      siteName: SEO_SITE_NAME,
      title,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${SEO_SITE_NAME} logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export function buildNoIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  }
}
