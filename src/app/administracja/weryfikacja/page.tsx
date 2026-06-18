import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import {
  fetchApprovedVerificationQueue,
  fetchPendingVerificationQueue,
  fetchRejectedVerificationQueue,
} from '../../../lib/database/admin-verification';
import { createAdminClientOrNull } from '../../../lib/supabase/admin';
import { fetchEmailConfirmationByUserIds } from '../../../lib/auth/email-confirmation';
import { VerificationQueueTabs } from '../../../components/admin/VerificationQueueTabs';

function enrichWithEmailConfirmation<T extends { userId: string }>(
  rows: T[],
  emailMap: Map<string, boolean>,
): Array<T & { emailConfirmed: boolean }> {
  return rows.map(row => ({
    ...row,
    emailConfirmed: emailMap.get(row.userId) ?? false,
  }));
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
  const emailMap = elevatedClient
    ? await fetchEmailConfirmationByUserIds(elevatedClient, allUserIds)
    : new Map<string, boolean>();

  const pending = enrichWithEmailConfirmation(pendingRaw, emailMap);
  const rejected = enrichWithEmailConfirmation(rejectedRaw, emailMap);
  const approved = enrichWithEmailConfirmation(approvedRaw, emailMap);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Weryfikacja użytkowników</h2>
      <p className="text-sm text-muted-foreground">
        Konta bez potwierdzonego adresu email są widoczne w zakładce „Weryfikacja email”. Pozostałe
        oczekujące na decyzję administracyjną — w zakładce „W toku”, także bez przesłanych
        dokumentów.
      </p>
      <VerificationQueueTabs pending={pending} rejected={rejected} approved={approved} />
    </div>
  );
}
