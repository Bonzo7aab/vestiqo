import { FileSignature } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { fetchCommunityAccountClaims } from '../../../lib/database/community-account-claims';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { CommunityClaimsTable } from '../../../components/admin/CommunityClaimsTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

export default async function AdminCommunityClaimsPage() {
  const { supabase } = await requirePlatformAdmin('/administracja/odzyskanie-wspolnoty');
  const [pending, approved, rejected] = await Promise.all([
    fetchCommunityAccountClaims(supabase, 'pending'),
    fetchCommunityAccountClaims(supabase, 'approved'),
    fetchCommunityAccountClaims(supabase, 'rejected'),
  ]);

  const overdueCount = pending.filter((item) => item.isOverdue).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={FileSignature}
        title="Odzyskanie wspólnoty"
        description="Wnioski wspólnot bez własnego loginu. SLA: 48 godzin od złożenia uchwały."
        aside={
          <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">W toku</span>
            <span className="text-2xl font-semibold tabular-nums">{pending.length}</span>
            <span className="text-xs text-muted-foreground">
              {overdueCount} po terminie 48 h
            </span>
          </div>
        }
      />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">W toku ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Zaakceptowane ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Odrzucone ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="pt-4">
          <CommunityClaimsTable items={pending} emptyLabel="Brak wniosków oczekujących na decyzję." />
        </TabsContent>
        <TabsContent value="approved" className="pt-4">
          <CommunityClaimsTable items={approved} emptyLabel="Brak zaakceptowanych wniosków." />
        </TabsContent>
        <TabsContent value="rejected" className="pt-4">
          <CommunityClaimsTable items={rejected} emptyLabel="Brak odrzuconych wniosków." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
