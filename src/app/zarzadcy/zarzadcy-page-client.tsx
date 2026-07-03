'use client'

import { useRouter } from 'next/navigation'
import ManagerBrowsePage from '../../components/ManagerBrowsePage'

export function ManagersPageClient() {
  const router = useRouter()

  return (
    <ManagerBrowsePage
      onBack={() => router.push('/')}
      onManagerSelect={(managerId: string) => router.push(`/zarzadcy/${managerId}`)}
    />
  )
}
