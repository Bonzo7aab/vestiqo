import { Flag } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { loadAdminFeatureFlags } from '../../../lib/flagship/admin-flags';
import { AdminFeatureFlagsPanel } from '../../../components/admin/AdminFeatureFlagsPanel';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';

export default async function AdminFlagsPage() {
  const { userId, email } = await requirePlatformAdmin('/administracja/flagi');
  const initial = await loadAdminFeatureFlags({ id: userId, email });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={Flag}
        title="Flagi funkcji"
        description="Włączaj i wyłączaj funkcje platformy (Cloudflare Flagship). Preview i produkcja używają osobnych aplikacji — zmiana tutaj dotyczy tylko tego środowiska."
      />
      <AdminFeatureFlagsPanel initial={initial} />
    </div>
  );
}
