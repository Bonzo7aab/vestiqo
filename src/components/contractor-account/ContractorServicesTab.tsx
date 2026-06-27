'use client';

import Link from 'next/link';
import { Edit2, Loader2, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { CategoryDirectoryPicker } from './CategoryDirectoryPicker';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { updateContractorServiceSubcategories } from '../../lib/database/contractor-service-categories';
import { kontoCompanyDataHref } from '../../lib/konto-tabs';

interface ContractorServicesTabProps {
  companyId: string | null;
  initialSubcategorySlugs?: string[];
}

export function ContractorServicesTab({
  companyId,
  initialSubcategorySlugs = [],
}: ContractorServicesTabProps) {
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(
    () => new Set(initialSubcategorySlugs),
  );
  const [draftSlugs, setDraftSlugs] = useState<Set<string>>(
    () => new Set(initialSubcategorySlugs),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleToggle = useCallback((slug: string) => {
    setDraftSlugs((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDraftSlugs(new Set(savedSlugs));
    setIsEditing(false);
  }, [savedSlugs]);

  const handleSave = useCallback(async () => {
    if (!companyId || saving) return;

    const previous = new Set(savedSlugs);
    const next = [...draftSlugs];

    setSaving(true);

    const { error } = await updateContractorServiceSubcategories(companyId, next);

    if (error) {
      setDraftSlugs(previous);
      toast.error(error.message);
    } else {
      const saved = new Set(next);
      setSavedSlugs(saved);
      setDraftSlugs(saved);
      setIsEditing(false);
      toast.success('Zapisano usługi');
    }

    setSaving(false);
  }, [companyId, draftSlugs, savedSlugs, saving]);

  if (!companyId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">
            Nie znaleziono firmy.{' '}
            <Link href={kontoCompanyDataHref('contractor')} className="text-primary hover:underline">
              Uzupełnij dane firmy
            </Link>{' '}
            w zakładce Twoje dane.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[hsl(var(--brand-navy))]">
            Wybierz kategorie świadczonych usług
          </h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Kliknij w podkategorie, w których specjalizuje się Twoja firma. Wybrane tagi określają
            profil Twojej działalności na platformie Vestiqo i służą do automatycznego dopasowywania
            przesyłanych zapytań ofertowych od Zarządców.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={saving}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edytuj
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Anuluj
              </Button>
              <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  'Zapisz'
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <CategoryDirectoryPicker
        selectedSlugs={isEditing ? draftSlugs : savedSlugs}
        onToggle={handleToggle}
        disabled={!isEditing || saving}
      />
    </div>
  );
}
