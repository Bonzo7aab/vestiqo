import type { MetadataRoute } from 'next'
import { getAbsoluteUrl, getSeoOrigin } from '../lib/seo'

const PRIVATE_PATH_PREFIXES: string[] = [
  '/administracja',
  '/administracja/',
  '/panel-zarzadcy',
  '/panel-zarzadcy/',
  '/panel-wykonawcy',
  '/panel-wykonawcy/',
  '/konto',
  '/wiadomosci',
  '/zapisane-zgloszenia',
  '/dodaj-konkurs',
  '/dodaj-przetarg',
  '/tworzenie-przetargu',
  '/weryfikacja',
  '/uzupelnianie-profilu',
  '/powitanie',
  '/wdrozenie',
  '/auth/',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATH_PREFIXES,
      },
    ],
    sitemap: getAbsoluteUrl('/sitemap.xml'),
    host: getSeoOrigin(),
  }
}
