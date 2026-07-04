import { Building2 } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { fetchAdminTenderListings } from '../../../lib/database/admin-listings';
import { ListingsModerationPanel } from '../../../components/admin/ListingsModerationPanel';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';

export default async function AdminListingsPage() {
  const { supabase } = await requirePlatformAdmin('/administracja/zgloszenia');
  const tenders = await fetchAdminTenderListings(supabase);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={Building2}
        title="Moderacja konkursów"
        description="Przeglądaj i moderuj konkursy zarządców. Rozwiń wiersz, aby edytować szczegóły lub zawiesić ogłoszenie."
        aside={
          <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Konkursy</span>
            <span className="text-2xl font-semibold tabular-nums">{tenders.length}</span>
          </div>
        }
      />
      <ListingsModerationPanel tenders={tenders} />
    </div>
  );
}
