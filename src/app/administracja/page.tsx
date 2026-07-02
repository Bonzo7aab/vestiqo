import { Building2, FileWarning, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { requirePlatformAdmin } from '../../lib/admin/require-platform-admin';
import { fetchAdminDashboardMetrics } from '../../lib/database/admin-metrics';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminDashboardMetricCard } from '../../components/admin/AdminDashboardMetricCard';
import { AdminQuickActions } from '../../components/admin/AdminQuickActions';

export default async function AdminHomePage() {
  const { supabase } = await requirePlatformAdmin('/administracja');
  const metrics = await fetchAdminDashboardMetrics(supabase);

  const postsNoOffers = metrics.activeJobsWithoutApplications + metrics.activeTendersWithoutBids;
  const staleOffers = metrics.staleJobApplications + metrics.staleTenderBids;
  const totalAttention = postsNoOffers + staleOffers + metrics.contractorsOcExpiring7d;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Przegląd platformy"
        description="Monitor jakości rynku: zgłoszenia bez ofert, opóźniona akceptacja ofert oraz zbliżające się końce polis OC wykonawców."
        aside={
          <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-sm shadow-sm">
            <span className="text-muted-foreground">Łącznie do obsługi</span>
            <span className="text-2xl font-semibold tabular-nums">{totalAttention}</span>
            <span className="text-xs text-muted-foreground">Suma alertów wymagających uwagi</span>
          </div>
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Alerty jakości rynku</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Metryki wskazujące obszary wymagające interwencji administracyjnej.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AdminDashboardMetricCard
            icon={Building2}
            title="Zgłoszenia bez ofert"
            value={postsNoOffers}
            breakdown={`Zgłoszenia: ${metrics.activeJobsWithoutApplications}, przetargi: ${metrics.activeTendersWithoutBids}`}
            href="/administracja/ogloszenia"
            ctaLabel="Moderuj ogłoszenia"
          />
          <AdminDashboardMetricCard
            icon={FileWarning}
            title="Oferty > 48 h bez akceptacji"
            value={staleOffers}
            breakdown={`Aplikacje: ${metrics.staleJobApplications}, przetargi: ${metrics.staleTenderBids}`}
            href="/administracja/oferty"
            ctaLabel="Moderuj oferty"
          />
          <AdminDashboardMetricCard
            icon={ShieldAlert}
            title="Polisy OC wygasające (7 dni)"
            value={metrics.contractorsOcExpiring7d}
            breakdown="Wykonawcy z polisą OC wygasającą w ciągu najbliższego tygodnia."
            href="/administracja/weryfikacja"
            ctaLabel="Kolejka weryfikacji"
            footnote="Otwiera kolejkę weryfikacji użytkowników."
          />
        </div>
      </section>

      <AdminQuickActions />
    </div>
  );
}
