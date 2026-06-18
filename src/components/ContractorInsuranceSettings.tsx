'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, ExternalLink, FileUp, ShieldCheck, Trash2 } from 'lucide-react';
import { classifyOcForUser } from '../lib/contractor-oc-status';
import { toast } from 'sonner';
import {
  getContractorAccountSettings,
  getOcPolicyAllowedFormatsLabel,
  getOcPolicyScanSignedUrl,
  removeVerificationDocumentsFromBucket,
  upsertContractorAccountSettings,
} from '../lib/database/contractor-account';
import { uploadVerificationDocumentClient } from '../lib/verification/upload-document-client';
import { createClient } from '../lib/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ContractorInsuranceSettingsProps {
  userId: string;
}

const OC_POLICY_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

const OC_SETTINGS_SAVED_TOAST = 'Dane ubezpieczenia OC zostały zmienione';

export function ContractorInsuranceSettings({ userId }: ContractorInsuranceSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [ocValidUntil, setOcValidUntil] = React.useState('');
  const [policyPath, setPolicyPath] = React.useState<string | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        const settings = await getContractorAccountSettings(userId);
        setOcValidUntil(settings.ocValidUntil ?? '');

        // Fall back to the verification `insurance` document so the card
        // reflects OC uploaded via /weryfikacja too. If we resolve a path
        // via the fallback we proactively persist it to
        // `contractor_account_settings` so subsequent reads (and the OC
        // notice on /konto) stay consistent without another fallback.
        if (settings.ocPolicyScanPath) {
          setPolicyPath(settings.ocPolicyScanPath);
        } else {
          const supabase = createClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile } = await (supabase as any)
            .from('user_profiles')
            .select('verification_document_paths')
            .eq('id', userId)
            .maybeSingle();
          const verificationPaths =
            (profile?.verification_document_paths as Record<string, string> | null | undefined) ?? {};
          const insurancePath = verificationPaths.insurance ?? null;
          if (insurancePath) {
            setPolicyPath(insurancePath);
            try {
              await upsertContractorAccountSettings(userId, { ocPolicyScanPath: insurancePath });
            } catch (syncError) {
              console.error('Error backfilling OC scan path from verification docs:', syncError);
            }
          } else {
            setPolicyPath(null);
          }
        }
      } catch (error) {
        console.error('Error loading OC settings:', error);
        toast.error('Nie udało się załadować ustawień OC');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [userId]);

  React.useEffect(() => {
    if (!policyPath) {
      setPreviewSignedUrl(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const url = await getOcPolicyScanSignedUrl(policyPath);
      if (!cancelled) {
        setPreviewSignedUrl(url);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [policyPath]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const uploadResult = await uploadVerificationDocumentClient('oc-policy', file);
      if (uploadResult.error || !uploadResult.path) {
        toast.error(uploadResult.error ?? 'Nie udało się zapisać skanu polisy');
        return;
      }
      const saved = await upsertContractorAccountSettings(userId, {
        ocPolicyScanPath: uploadResult.path,
      });
      if (!saved.ocPolicyScanPath || saved.ocPolicyScanPath !== uploadResult.path) {
        toast.error(
          'Plik został wgrany do magazynu, ale ścieżka nie została zapisana w bazie. Uruchom migrację contractor_account_settings lub sprawdź RLS.'
        );
        return;
      }
      setPolicyPath(saved.ocPolicyScanPath);
      toast.success(OC_SETTINGS_SAVED_TOAST);
      // Refresh server state so the OC notice in the page header and the
      // /weryfikacja page reflect the newly synced scan immediately.
      router.refresh();
    } catch (error) {
      console.error('Error uploading OC policy:', error);
      const message =
        error instanceof Error ? error.message : 'Nie udało się zapisać skanu polisy';
      toast.error(message);
    } finally {
      setIsSaving(false);
      event.target.value = '';
    }
  };

  const handleRemoveScan = async () => {
    if (!policyPath) return;
    if (!window.confirm('Czy na pewno chcesz usunąć skan polisy? Plik zostanie usunięty z magazynu.')) {
      return;
    }
    try {
      setIsSaving(true);
      await removeVerificationDocumentsFromBucket([policyPath]);
      await upsertContractorAccountSettings(userId, { ocPolicyScanPath: null });
      setPolicyPath(null);
      toast.success('Skan polisy został usunięty');
      router.refresh();
    } catch (error) {
      console.error('Error removing OC policy scan:', error);
      toast.error('Nie udało się usunąć skanu polisy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDate = async () => {
    try {
      setIsSaving(true);
      await upsertContractorAccountSettings(userId, {
        ocValidUntil: ocValidUntil || null,
      });
      toast.success(OC_SETTINGS_SAVED_TOAST);
      router.refresh();
    } catch (error) {
      console.error('Error saving OC date:', error);
      toast.error('Nie udało się zapisać daty ważności OC');
    } finally {
      setIsSaving(false);
    }
  };

  const ocStatus = classifyOcForUser(ocValidUntil || null, Boolean(policyPath));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Ładowanie danych OC...</CardContent>
      </Card>
    );
  }

  return (
    <Card id="oc-policy" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Ubezpieczenie OC</span>
          {ocStatus.state === 'valid' && (
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-emerald-600"
              aria-label={`Polisa ważna do ${ocStatus.validUntilLabel}`}
            />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="oc-valid-until">Data ważności OC</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="oc-valid-until"
                type="date"
                className="pl-9"
                value={ocValidUntil}
                onChange={(event) => setOcValidUntil(event.target.value)}
              />
            </div>
            <Button onClick={handleSaveDate} disabled={isSaving}>
              Zapisz
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="oc-policy-file">Skan polisy OC</Label>
          <p className="text-xs text-muted-foreground">
            Dozwolone formaty: {getOcPolicyAllowedFormatsLabel()} · maks. 10 MB
          </p>
          <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 shadow-sm sm:flex-row sm:items-center sm:gap-0 sm:px-3 sm:py-2.5">
            <div className="min-w-0 flex-1 sm:border-r sm:border-border/70 sm:pr-4">
              {policyPath ? (
                <p className="truncate text-left text-sm leading-snug" title={policyPath}>
                  <span className="text-muted-foreground">Plik zapisany: </span>
                  <span className="font-medium text-foreground">{policyPath.split('/').pop()}</span>
                </p>
              ) : (
                <p className="text-left text-sm leading-snug text-muted-foreground">Brak dodanego skanu</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-4">
              {policyPath ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isSaving}
                  aria-label="Usuń skan"
                  onClick={() => void handleRemoveScan()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
              <Button variant="outline" size="sm" disabled={isSaving} className="h-9 shrink-0" asChild>
                <label htmlFor="oc-policy-file" className="cursor-pointer">
                  <FileUp className="mr-2 h-4 w-4" />
                  {policyPath ? 'Zamień' : 'Dodaj skan polisy'}
                </label>
              </Button>
              {policyPath && previewSignedUrl ? (
                <Button variant="outline" size="sm" className="h-9 shrink-0" asChild>
                  <a href={previewSignedUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Otwórz w nowej karcie
                  </a>
                </Button>
              ) : null}
              <input
                id="oc-policy-file"
                type="file"
                className="hidden"
                accept={OC_POLICY_ACCEPT}
                onChange={handleUpload}
              />
            </div>
          </div>

          {policyPath && !previewSignedUrl ? (
            <p className="text-xs text-destructive">
              Nie udało się przygotować linku do pliku. Sprawdź uprawnienia do magazynu plików lub
              zapisz plik ponownie.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
