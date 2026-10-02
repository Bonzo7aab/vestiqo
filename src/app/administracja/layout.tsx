import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { requirePlatformAdmin } from '../../lib/admin/require-platform-admin';
import { countPendingVerificationSubmissions } from '../../lib/database/admin-verification-notifications';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserAccountHeader } from '../../components/UserAccountHeader';
import { buildNoIndexMetadata } from '../../lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Panel administracyjny');

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const redirectTo = headerStore.get('x-pathname') ?? '/administracja';
  const { supabase } = await requirePlatformAdmin(redirectTo);
  const pendingVerificationCount = await countPendingVerificationSubmissions(supabase);

  return (
    <div className="min-h-screen bg-gray-50">
      <UserAccountHeader />
      <div className="border-b bg-card">
        <AdminNav pendingVerificationCount={pendingVerificationCount} />
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
