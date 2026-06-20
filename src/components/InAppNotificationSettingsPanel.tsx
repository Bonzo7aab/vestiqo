'use client';

import React from 'react';
import { Bell, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_IN_APP_NOTIFICATION_PREFERENCES,
  type InAppNotificationPreferences,
} from '../lib/notifications/opd41-preferences';
import {
  getNotificationPreferences,
  getNotifications,
  mapInAppNotificationPreferences,
  saveInAppNotificationPreferences,
} from '../lib/database/notifications';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';

interface InAppNotificationSettingsPanelProps {
  userId: string;
  userType: 'manager' | 'contractor';
}

interface NotificationListItem {
  id: string;
  title: string;
  message: string | null;
  createdAt: string;
}

const NotificationToggleField = ({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-start justify-between gap-4 rounded-md border p-3 ${disabled ? 'bg-muted/40' : ''}`}
  >
    <div className="min-w-0 space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-0.5" />
  </div>
);

export function InAppNotificationSettingsPanel({
  userId,
  userType,
}: InAppNotificationSettingsPanelProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [preferences, setPreferences] = React.useState<InAppNotificationPreferences>(
    DEFAULT_IN_APP_NOTIFICATION_PREFERENCES,
  );
  const [notifications, setNotifications] = React.useState<NotificationListItem[]>([]);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [prefsRow, notificationRows] = await Promise.all([
          getNotificationPreferences(userId),
          getNotifications(userId),
        ]);
        setPreferences(mapInAppNotificationPreferences(prefsRow));
        setNotifications(
          notificationRows.slice(0, 6).map((item) => ({
            id: item.id,
            title: item.title,
            message: item.message,
            createdAt: item.created_at ?? new Date().toISOString(),
          })),
        );
      } catch (error) {
        console.error('Error loading in-app notification settings:', error);
        toast.error('Nie udało się załadować ustawień powiadomień');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [userId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveInAppNotificationPreferences(userId, preferences);
      toast.success('Ustawienia powiadomień zostały zapisane');
    } catch (error) {
      console.error('Error saving in-app notification settings:', error);
      toast.error('Nie udało się zapisać ustawień powiadomień');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Ładowanie powiadomień...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Ustawienia powiadomień
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Powiadomienia krytyczne (np. zakończenie konkursu, komunikaty prawne) są zawsze
              wyświetlane w aplikacji i nie mają przełącznika ON/OFF.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {userType === 'manager' ? (
              <NotificationToggleField
                label="Pytania do konkursu"
                description="Powiadomimy Cię, gdy wykonawcy będą mieli wątpliwości techniczne do Twojego zapytania w trakcie trwania naboru."
                checked={preferences.managerContestQuestionNotifications}
                onChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    managerContestQuestionNotifications: checked,
                  }))
                }
              />
            ) : (
              <>
                <NotificationToggleField
                  label="Rozstrzygnięcie konkursu"
                  description="Otrzymasz informację, gdy Zarządca zaakceptuje Twoją ofertę lub zakończy konkurs, wybierając inną firmę."
                  checked={preferences.contractorContestResolutionNotifications}
                  onChange={(checked) =>
                    setPreferences((prev) => ({
                      ...prev,
                      contractorContestResolutionNotifications: checked,
                    }))
                  }
                />
                <NotificationToggleField
                  label="Odpowiedź na pytanie"
                  description="Powiadomimy Cię, gdy Zarządca odpowie na Twoje pytanie zadane w konkursie."
                  checked={preferences.contractorContestAnswerNotifications}
                  onChange={(checked) =>
                    setPreferences((prev) => ({
                      ...prev,
                      contractorContestAnswerNotifications: checked,
                    }))
                  }
                />
              </>
            )}
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            Zapisz ustawienia
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista powiadomień</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak powiadomień.</p>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{notification.title}</p>
                {notification.message ? (
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString('pl-PL')}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
