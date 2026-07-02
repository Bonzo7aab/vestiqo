'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { updateRegistrationSettingsAction } from '../../app/administracja/actions';
import type { RegistrationSettings } from '../../lib/registration-settings-shared';
import { cn } from '../ui/utils';

interface AdminRegistrationSettingsFormProps {
  initialSettings: RegistrationSettings;
}

export function AdminRegistrationSettingsForm({
  initialSettings,
}: AdminRegistrationSettingsFormProps) {
  const [contractorOpen, setContractorOpen] = useState(initialSettings.contractorOpen);
  const [managerOpen, setManagerOpen] = useState(initialSettings.managerOpen);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateRegistrationSettingsAction(contractorOpen, managerOpen);
      if (result.ok) {
        toast.success('Ustawienia rejestracji zostały zapisane');
      } else {
        toast.error(result.error ?? 'Nie udało się zapisać ustawień');
      }
    });
  };

  const hasChanges =
    contractorOpen !== initialSettings.contractorOpen ||
    managerOpen !== initialSettings.managerOpen;

  return (
    <Card className="h-full shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base">Rejestracja nowych użytkowników</CardTitle>
        </div>
        <CardDescription>
          Wstrzymaj rejestrację osobno dla wykonawców i zarządców. Istniejące konta nie są dotknięte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="contractor-registration">Rejestracja wykonawców</Label>
                <Badge
                  variant="outline"
                  className={cn(
                    contractorOpen
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800',
                  )}
                >
                  {contractorOpen ? 'Otwarta' : 'Wstrzymana'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {contractorOpen
                  ? 'Nowi wykonawcy mogą zakładać konta'
                  : 'Rejestracja wykonawców jest wstrzymana'}
              </p>
            </div>
            <Switch
              id="contractor-registration"
              checked={contractorOpen}
              onCheckedChange={setContractorOpen}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="manager-registration">Rejestracja zarządców</Label>
                <Badge
                  variant="outline"
                  className={cn(
                    managerOpen
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800',
                  )}
                >
                  {managerOpen ? 'Otwarta' : 'Wstrzymana'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {managerOpen
                  ? 'Nowi zarządcy mogą zakładać konta'
                  : 'Rejestracja zarządców jest wstrzymana'}
              </p>
            </div>
            <Switch
              id="manager-registration"
              checked={managerOpen}
              onCheckedChange={setManagerOpen}
              disabled={isPending}
            />
          </div>
        </div>

        {hasChanges ? (
          <div className="sticky bottom-4 z-10 flex justify-end rounded-lg border border-primary/20 bg-card p-3 shadow-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <Button type="button" onClick={handleSave} disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Brak niezapisanych zmian.</p>
        )}
      </CardContent>
    </Card>
  );
}
