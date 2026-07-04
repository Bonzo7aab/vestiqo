import { ClipboardCheck } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import {
  fetchApprovedVerificationQueue,
  fetchPendingVerificationQueue,
  fetchRejectedVerificationQueue,
} from '../../../lib/database/admin-verification';
import { createAdminClientOrNull } from '../../../lib/supabase/admin';
import { fetchAuthUserMetaByUserIds } from '../../../lib/auth/email-confirmation';
import { VerificationQueueTabs } from '../../../components/admin/VerificationQueueTabs';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';

function enrichWithAuthMeta<T extends { userId: string }>(
  rows: T[],
  authMetaMap: Map<string, { email: string | null; emailConfirmed: boolean }>,
): Array<T & { email: string | null; emailConfirmed: boolean }> {
  return rows.map((row) => {
    const meta = authMetaMap.get(row.userId);
    return {
      ...row,
      email: meta?.email ?? null,
      emailConfirmed: meta?.emailConfirmed ?? false,
    };
  });
}

export default async function AdminVerificationQueuePage() {
  const { supabase } = await requirePlatformAdmin('/administracja/weryfikacja');
  const [pendingRaw, rejectedRaw, approvedRaw] = await Promise.all([
    fetchPendingVerificationQueue(supabase),
    fetchRejectedVerificationQueue(supabase),
    fetchApprovedVerificationQueue(supabase),
  ]);

  const allUserIds = [
    ...pendingRaw.map(r => r.userId),
    ...rejectedRaw.map(r => r.userId),
    ...approvedRaw.map(r => r.userId),
  ];

  const elevatedClient = createAdminClientOrNull();
  const authMetaMap = elevatedClient
    ? await fetchAuthUserMetaByUserIds(elevatedClient, allUserIds)
    : new Map<string, { email: string | null; emailConfirmed: boolean }>();

  const pending = enrichWithAuthMeta(pendingRaw, authMetaMap);
  const rejected = enrichWithAuthMeta(rejectedRaw, authMetaMap);
  const approved = enrichWithAuthMeta(approvedRaw, authMetaMap);

  const totalPending = pending.length;
  const totalActionable = pending.filter(r => r.emailConfirmed).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={ClipboardCheck}
        title="Weryfikacja użytkowników"
        description="Wybierz typ konta i status, a następnie kliknij wiersz w tabeli, aby otworzyć szczegóły użytkownika."
        aside={
          <div className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Wymaga decyzji</span>
            <span className="text-2xl font-semibold tabular-nums">{totalActionable}</span>
            <span className="text-xs text-muted-foreground">
              {totalPending} łącznie w toku (z email bez potwierdzenia)
            </span>
          </div>
        }
      />
      <VerificationQueueTabs pending={pending} rejected={rejected} approved={approved} />
    </div>
  );
}
