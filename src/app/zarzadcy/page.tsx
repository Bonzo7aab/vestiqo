import type { Metadata } from 'next'
import { buildPageMetadata } from '../../lib/seo'
import { ManagersPageClient } from './zarzadcy-page-client'

export const metadata: Metadata = buildPageMetadata({
  title: 'Zarządcy nieruchomości',
  description: 'Poznaj profile zarządców i wspólnot aktywnie korzystających z platformy Vestiqo.',
  pathname: '/zarzadcy',
})

export default function ManagersPage() {
  return <ManagersPageClient />
}
