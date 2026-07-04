import type { Metadata } from 'next'
import { buildPageMetadata } from '../../lib/seo'
import { contractorsKeywords } from '../../lib/seo-keywords'
import { ContractorsPageClient } from './wykonawcy-page-client'

export const metadata: Metadata = buildPageMetadata({
  title: 'Wykonawcy',
  description: 'Przeglądaj profile sprawdzonych wykonawców działających w platformie Vestiqo.',
  pathname: '/wykonawcy',
  keywords: [...contractorsKeywords],
})

export default function ContractorsPage() {
  return <ContractorsPageClient />
}
