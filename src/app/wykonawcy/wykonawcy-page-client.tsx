'use client'

import { useRouter } from 'next/navigation'
import ContractorBrowsePage from '../../components/ContractorBrowsePage'

export function ContractorsPageClient() {
  const router = useRouter()

  return (
    <ContractorBrowsePage
      onBack={() => router.push('/')}
      onContractorSelect={(contractorId: string) => router.push(`/wykonawcy/${contractorId}`)}
    />
  )
}
