import Link from 'next/link';
import { headers } from 'next/headers';
import { requirePlatformAdmin } from '../../lib/admin/require-platform-admin';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserAccountHeader } from '../../components/UserAccountHeader';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const redirectTo = headerStore.get('x-pathname') ?? '/administracja';
  await requirePlatformAdmin(redirectTo);

  return (
    <div className="min-h-screen bg-gray-50">
      <UserAccountHeader />
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 py-1.5 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Wróć do strony głównej
          </Link>
        </div>
        <AdminNav />
      </div>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
