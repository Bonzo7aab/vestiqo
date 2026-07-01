import { Building2 } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { fetchAdminJobListings, fetchAdminTenderListings } from '../../../lib/database/admin-listings';
import { ListingsModerationPanel } from '../../../components/admin/ListingsModerationPanel';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';

export default async function AdminListingsPage() {
  const { supabase } = await requirePlatformAdmin('/administracja/ogloszenia');
  const [jobs, tenders] = await Promise.all([
    fetchAdminJobListings(supabase),
    fetchAdminTenderListings(supabase),
  ]);

  const total = jobs.length + tenders.length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={Building2}
        title="Moderacja zgłoszeń zarządców"
        description="Przeglądaj i moderuj zgłoszenia pracy oraz przetargi. Rozwiń wiersz, aby edytować szczegóły lub zawiesić listing."
        aside={
          <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Łącznie</span>
            <span className="text-2xl font-semibold tabular-nums">{total}</span>
            <span className="text-xs text-muted-foreground">
              {jobs.length} zgłoszeń · {tenders.length} przetargów
            </span>
          </div>
        }
      />
      <ListingsModerationPanel jobs={jobs} tenders={tenders} />
    </div>
  );
}
