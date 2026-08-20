'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getContractorAccountSettings,
  upsertContractorAccountSettings,
} from '../lib/database/contractor-account';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ProfessionalQualificationTypePicker } from './ProfessionalQualificationTypePicker';

interface ContractorProfessionalQualificationsChecklistProps {
  userId: string;
}

export function ContractorProfessionalQualificationsChecklist({
  userId,
}: ContractorProfessionalQualificationsChecklistProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const settings = await getContractorAccountSettings(userId);
        setSelected(settings.professionalQualificationTypes);
      } catch (error) {
        console.error(error);
        toast.error('Nie udało się załadować uprawnień');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [userId]);

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await upsertContractorAccountSettings(userId, {
        professionalQualificationTypes: selected,
      });
      toast.success('Lista uprawnień zapisana');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Nie udało się zapisać uprawnień');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Ładowanie listy uprawnień…</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">Typy uprawnień w profilu</h4>
            {selected.length > 0 ? (
              <Badge variant="secondary" className="text-[10px] font-medium tabular-nums">
                {selected.length} wybrane
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Kliknij tagi zgodne z Twoimi certyfikatami — ułatwi to weryfikację profilu.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={handleSave}
          className="shrink-0 self-start"
        >
          {isSaving ? 'Zapisywanie…' : 'Zapisz uprawnienia'}
        </Button>
      </div>

      <ProfessionalQualificationTypePicker selected={selected} onToggle={toggle} />
    </div>
  );
}
