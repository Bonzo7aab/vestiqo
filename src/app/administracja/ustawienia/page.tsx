import { Settings } from 'lucide-react';
import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { getRegistrationSettings } from '../../../lib/database/platform-settings';
import { AdminRegistrationSettingsForm } from '../../../components/admin/AdminRegistrationSettingsForm';
import { AdminSystemAnnouncementForm } from '../../../components/admin/AdminSystemAnnouncementForm';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';

export default async function AdminSettingsPage() {
  const { supabase } = await requirePlatformAdmin('/administracja/ustawienia');
  const settings = await getRegistrationSettings(supabase);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={Settings}
        title="Ustawienia platformy"
        description="Konfiguracja globalna wpływająca na rejestrację nowych użytkowników i komunikaty systemowe."
      />

      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Rejestracja</span> — kontroluj, kto może zakładać
          nowe konta.{' '}
          <span className="font-medium text-foreground">Komunikaty</span> — wysyłaj krytyczne powiadomienia
          in-app do wszystkich użytkowników.
        </p>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:items-start">
        <AdminRegistrationSettingsForm initialSettings={settings} />
        <AdminSystemAnnouncementForm />
      </div>
    </div>
  );
}
