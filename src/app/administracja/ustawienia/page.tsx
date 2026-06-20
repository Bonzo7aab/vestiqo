import { requirePlatformAdmin } from '../../../lib/admin/require-platform-admin';
import { getRegistrationSettings } from '../../../lib/database/platform-settings';
import { AdminRegistrationSettingsForm } from '../../../components/admin/AdminRegistrationSettingsForm';
import { AdminSystemAnnouncementForm } from '../../../components/admin/AdminSystemAnnouncementForm';

export default async function AdminSettingsPage() {
  const { supabase } = await requirePlatformAdmin('/administracja/ustawienia');
  const settings = await getRegistrationSettings(supabase);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Ustawienia platformy</h2>
        <p className="text-sm text-muted-foreground">
          Konfiguracja globalna wpływająca na rejestrację nowych użytkowników i komunikaty systemowe.
        </p>
      </div>
      <AdminRegistrationSettingsForm initialSettings={settings} />
      <AdminSystemAnnouncementForm />
    </div>
  );
}
