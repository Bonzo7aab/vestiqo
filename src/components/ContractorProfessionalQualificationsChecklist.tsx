'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, ExternalLink, FileUp, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { removeAccountVerificationDocumentAction } from '../app/weryfikacja/actions';
import {
  getContractorAccountSettings,
  getOcPolicyAllowedFormatsLabel,
  getVerificationDocumentSignedUrl,
  mergeProfessionalQualificationDocument,
  upsertContractorAccountSettings,
  uploadProfessionalQualificationTypeScan,
} from '../lib/database/contractor-account';
import {
  professionalQualificationLabel,
} from '../lib/contractor/constants';
import type {
  ProfessionalQualificationDocument,
  ProfessionalQualificationDocuments,
} from '../lib/contractor/professional-qualification-documents';
import { DocumentRemovalAlertDialog } from './verification/DocumentRemovalAlertDialog';
import { ProfessionalQualificationTypePicker } from './ProfessionalQualificationTypePicker';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ContractorProfessionalQualificationsChecklistProps {
  userId: string;
}

const SCAN_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp';

function fileNameFromPath(path: string): string {
  return path.split('/').pop() ?? path;
}

export function ContractorProfessionalQualificationsChecklist({
  userId,
}: ContractorProfessionalQualificationsChecklistProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingTypes, setIsSavingTypes] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [documents, setDocuments] = React.useState<ProfessionalQualificationDocuments>({});

  React.useEffect(() => {
    const load = async () => {
      try {
        const settings = await getContractorAccountSettings(userId);
        setSelected(settings.professionalQualificationTypes);
        setDocuments(settings.professionalQualificationDocuments);
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
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSaveTypes = async () => {
    try {
      setIsSavingTypes(true);
      await upsertContractorAccountSettings(userId, {
        professionalQualificationTypes: selected,
      });
      toast.success('Lista uprawnień zapisana');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Nie udało się zapisać uprawnień');
    } finally {
      setIsSavingTypes(false);
    }
  };

  const handleDocumentChange = (typeId: string, next: ProfessionalQualificationDocument | null) => {
    setDocuments((prev) => {
      const copy = { ...prev };
      if (next) {
        copy[typeId] = next;
      } else {
        delete copy[typeId];
      }
      return copy;
    });
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
            Zaznacz typy i dodaj skan do każdego z nich — oferta zaciągnie pliki wymagane w konkursie.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isSavingTypes}
          onClick={() => void handleSaveTypes()}
          className="shrink-0 self-start"
        >
          {isSavingTypes ? 'Zapisywanie…' : 'Zapisz uprawnienia'}
        </Button>
      </div>

      <ProfessionalQualificationTypePicker selected={selected} onToggle={toggle} />

      {selected.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Skany przypisane do typów</h4>
          {selected.map((typeId) => (
            <QualificationTypeDocumentRow
              key={typeId}
              userId={userId}
              typeId={typeId}
              document={documents[typeId] ?? null}
              onChange={(next) => handleDocumentChange(typeId, next)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface QualificationTypeDocumentRowProps {
  userId: string;
  typeId: string;
  document: ProfessionalQualificationDocument | null;
  onChange: (next: ProfessionalQualificationDocument | null) => void;
}

function QualificationTypeDocumentRow({
  userId,
  typeId,
  document,
  onChange,
}: QualificationTypeDocumentRowProps) {
  const router = useRouter();
  const inputId = `pq-scan-${typeId}`;
  const dateId = `pq-until-${typeId}`;
  const [isSaving, setIsSaving] = React.useState(false);
  const [validUntil, setValidUntil] = React.useState(document?.validUntil ?? '');
  const [previewSignedUrl, setPreviewSignedUrl] = React.useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false);

  React.useEffect(() => {
    setValidUntil(document?.validUntil ?? '');
  }, [document?.validUntil]);

  React.useEffect(() => {
    if (!document?.path) {
      setPreviewSignedUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const url = await getVerificationDocumentSignedUrl(document.path);
      if (!cancelled) setPreviewSignedUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [document?.path]);

  const persistDocuments = async (
    nextDoc: ProfessionalQualificationDocument | null,
  ): Promise<ProfessionalQualificationDocuments> => {
    return mergeProfessionalQualificationDocument(userId, typeId, nextDoc);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsSaving(true);
      const uploadResult = await uploadProfessionalQualificationTypeScan(userId, typeId, file);
      const nextDoc: ProfessionalQualificationDocument = {
        path: uploadResult.path,
        fileName: file.name,
        validUntil: validUntil || null,
      };
      const savedDocs = await persistDocuments(nextDoc);
      onChange(savedDocs[typeId] ?? nextDoc);
      toast.success('Skan zapisany');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać skanu');
    } finally {
      setIsSaving(false);
      event.target.value = '';
    }
  };

  const handleSaveDate = async () => {
    if (!document) {
      toast.error('Najpierw dodaj skan, potem datę ważności');
      return;
    }
    try {
      setIsSaving(true);
      const nextDoc: ProfessionalQualificationDocument = {
        ...document,
        validUntil: validUntil || null,
      };
      const savedDocs = await persistDocuments(nextDoc);
      onChange(savedDocs[typeId] ?? nextDoc);
      toast.success('Data ważności zapisana');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Nie udało się zapisać daty ważności');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemove = async () => {
    try {
      setIsSaving(true);
      const result = await removeAccountVerificationDocumentAction({
        kind: 'professional_qualification_document',
        typeId,
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Nie udało się usunąć skanu');
        return;
      }
      onChange(null);
      setShowRemoveDialog(false);
      toast.success(
        result.verificationReset
          ? 'Skan usunięty. Uzupełnij dokumenty i prześlij je ponownie do weryfikacji.'
          : 'Skan został usunięty',
      );
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error('Nie udało się usunąć skanu');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = document?.fileName || (document?.path ? fileNameFromPath(document.path) : null);

  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-3 sm:p-4">
      <p className="text-sm font-medium text-foreground">{professionalQualificationLabel(typeId)}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {getOcPolicyAllowedFormatsLabel()} · maks. 10 MB
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={dateId} className="text-xs font-medium">
            Data ważności (opcjonalnie)
          </Label>
          <div className="relative sm:max-w-xs">
            <Calendar className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id={dateId}
              type="date"
              className="bg-background pl-9"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isSaving || !document}
          onClick={() => void handleSaveDate()}
          className="shrink-0"
        >
          Zapisz datę
        </Button>
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {displayName ? (
            <p className="truncate text-sm font-medium" title={displayName}>
              {displayName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Brak dodanego skanu</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {document ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isSaving}
              aria-label="Usuń skan"
              onClick={() => setShowRemoveDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
          <Button variant="outline" size="sm" disabled={isSaving} className="h-9 shrink-0" asChild>
            <label htmlFor={inputId} className="cursor-pointer">
              <FileUp className="mr-2 h-4 w-4" />
              {document ? 'Zamień' : 'Dodaj skan'}
            </label>
          </Button>
          {document && previewSignedUrl ? (
            <Button variant="outline" size="sm" className="h-9 shrink-0" asChild>
              <a href={previewSignedUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Otwórz
              </a>
            </Button>
          ) : null}
          <input
            id={inputId}
            type="file"
            className="hidden"
            accept={SCAN_ACCEPT}
            onChange={(event) => void handleUpload(event)}
          />
        </div>
      </div>

      <DocumentRemovalAlertDialog
        open={showRemoveDialog}
        onOpenChange={(open) => {
          if (!open && !isSaving) setShowRemoveDialog(false);
        }}
        onConfirm={() => void handleConfirmRemove()}
        isPending={isSaving}
        title="Usunąć skan uprawnienia?"
      />
    </div>
  );
}
