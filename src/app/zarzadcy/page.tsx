import type { Metadata } from 'next'
import { buildPageMetadata } from '../../lib/seo'
import { communitiesKeywords } from '../../lib/seo-keywords'
import { ManagersPageClient } from './zarzadcy-page-client'

export const metadata: Metadata = buildPageMetadata({
  title: 'Zarządcy nieruchomości',
  description: 'Poznaj profile zarządców i wspólnot aktywnie korzystających z platformy Vestiqo.',
  pathname: '/zarzadcy',
  keywords: [...communitiesKeywords],
})

export default function ManagersPage() {
  return <ManagersPageClient />
}
