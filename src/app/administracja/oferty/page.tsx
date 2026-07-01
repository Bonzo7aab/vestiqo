import { FileWarning } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { fetchAdminJobApplications, fetchAdminTenderBids } from '../../../lib/database/admin-offers';
import { OffersModerationPanel } from '../../../components/admin/OffersModerationPanel';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';

export default async function AdminOffersPage() {
  const { supabase } = await requirePlatformAdmin('/administracja/oferty');
  const [applications, bids] = await Promise.all([
    fetchAdminJobApplications(supabase),
    fetchAdminTenderBids(supabase),
  ]);

  const total = applications.length + bids.length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={FileWarning}
        title="Moderacja ofert wykonawców"
        description="Przeglądaj oferty na zgłoszenia i przetargi. Rozwiń wiersz, aby zawiesić ofertę lub zaktualizować dane."
        aside={
          <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Łącznie</span>
            <span className="text-2xl font-semibold tabular-nums">{total}</span>
            <span className="text-xs text-muted-foreground">
              {applications.length} na zgłoszenia · {bids.length} przetargowe
            </span>
          </div>
        }
      />
      <OffersModerationPanel applications={applications} bids={bids} />
    </div>
  );
}
