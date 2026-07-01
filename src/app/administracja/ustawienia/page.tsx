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
      <div className="max-w-lg space-y-6">
        <AdminRegistrationSettingsForm initialSettings={settings} />
        <AdminSystemAnnouncementForm />
      </div>
    </div>
  );
}
