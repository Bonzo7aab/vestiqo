import type { MetadataRoute } from 'next'
import { newsArticles } from '../lib/content/aktualnosci'
import { getAbsoluteUrl } from '../lib/seo'

const PUBLIC_ROUTES = [
  '/',
  '/aktualnosci',
  '/faq',
  '/kontakt',
  '/o-nas',
  '/kategorie-uslug',
  '/dla-wspolnot',
  '/dla-wykonawcow',
  '/pomoc-dla-zarzadcow',
  '/pomoc-dla-wykonawcow',
  '/wykonawcy',
  '/zarzadcy',
  '/regulamin',
  '/polityka-prywatnosci',
  '/ustawienia-plikow-cookie',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((pathname) => ({
    url: getAbsoluteUrl(pathname),
    lastModified,
    changeFrequency: pathname === '/' ? 'daily' : 'weekly',
    priority: pathname === '/' ? 1 : 0.7,
  }))

  const newsEntries: MetadataRoute.Sitemap = newsArticles.map((article) => ({
    url: getAbsoluteUrl(`/aktualnosci/${article.slug}`),
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticEntries, ...newsEntries]
}
