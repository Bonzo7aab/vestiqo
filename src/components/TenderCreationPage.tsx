'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TenderContestForm } from './tender-creation/TenderContestForm';
import { TenderContestPageHeader } from './tender-creation/TenderContestPageHeader';
import { useUserProfile } from '../contexts/AuthContext';
import { createClient } from '../lib/supabase/client';
import { createTender, fetchTenderById, updateTender } from '../lib/database/jobs';
import type { TenderWithCompany } from '../lib/database/jobs';
import { fetchUserPrimaryCompany } from '../lib/database/companies';
import {
  fetchContestBuildingIds,
  replaceContestBuildings,
} from '../lib/database/contest-buildings';
import { uploadContestDocuments } from '../lib/storage/contest-documents';
import {
  buildCreateTenderPayload,
  clearContestFormDates,
  contestPayloadToUpsertData,
  mapTenderRowToContestForm,
  parseExistingTenderDocuments,
} from '../lib/contest/build-tender-payload';
import type { TenderContestDocumentMeta, TenderContestFormData } from '../types/tender-contest';
import { createEmptyTenderContestForm } from '../types/tender-contest';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { cn } from './ui/utils';
import { Loader2 } from 'lucide-react';

interface TenderCreationPageProps {
  onBack: () => void;
  backLabel?: string;
  tenderId?: string;
  /** Copy an existing contest into a new draft; schedule fields are left empty. */
  duplicateFromId?: string;
  /** Hide sticky page header (back link, title, subtitle). */
  hidePageHeader?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
  prefillEntityId?: string;
  prefillBuildingId?: string;
  prefillCategory?: string;
  prefillSubcategory?: string;
}

export default function TenderCreationPage({
  onBack,
  backLabel,
  tenderId,
  duplicateFromId,
  hidePageHeader = false,
  pageTitle,
  pageSubtitle,
  prefillEntityId,
  prefillBuildingId,
  prefillCategory,
  prefillSubcategory,
}: TenderCreationPageProps): React.ReactElement {
  const { user, session, isLoading } = useUserProfile();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirectingAfterPublish, setIsRedirectingAfterPublish] = useState(false);
  const [isLoadingTender, setIsLoadingTender] = useState(Boolean(tenderId || duplicateFromId));
  const [initialTender, setInitialTender] = useState<TenderWithCompany | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadedBuildingIds, setLoadedBuildingIds] = useState<string[]>([]);

  const isEditMode = Boolean(tenderId);
  const isDuplicateMode = Boolean(duplicateFromId) && !isEditMode;

  useEffect(() => {
    const loginPath = isEditMode
      ? `/logowanie?redirectTo=${encodeURIComponent(`/dodaj-konkurs/${tenderId}`)}`
      : `/logowanie?redirectTo=${encodeURIComponent('/dodaj-konkurs')}`;
    if (!isLoading && !user && !session) {
      router.push(loginPath);
    }
  }, [user, session, isLoading, router, isEditMode, tenderId]);

  useEffect(() => {
    if (!tenderId || !user?.id) {
      if (!duplicateFromId) {
        setIsLoadingTender(false);
      }
      return;
    }

    const load = async (): Promise<void> => {
      setIsLoadingTender(true);
      setLoadError(null);
      try {
        const supabase = createClient();
        const { data: company, error: companyError } = await fetchUserPrimaryCompany(
          supabase,
          user.id,
        );
        if (companyError || !company) {
          setLoadError('Nie znaleziono firmy.');
          return;
        }

        const { data: tender, error } = await fetchTenderById(supabase, tenderId);
        if (error || !tender) {
          setLoadError('Nie znaleziono konkursu.');
          return;
        }

        if (tender.company?.id !== company.id) {
          setLoadError('Brak dostępu do tego konkursu.');
          return;
        }

        if (tender.status !== 'draft') {
          setLoadError('Tylko szkic konkursu można uzupełniać w tym widoku.');
          return;
        }

        setInitialTender(tender);
        const { data: buildingIds } = await fetchContestBuildingIds(supabase, tender.id);
        setLoadedBuildingIds(buildingIds);
      } catch {
        setLoadError('Nie udało się wczytać konkursu.');
      } finally {
        setIsLoadingTender(false);
      }
    };

    void load();
  }, [tenderId, duplicateFromId, user?.id]);

  useEffect(() => {
    if (!duplicateFromId || tenderId || !user?.id) {
      return;
    }

    const loadDuplicate = async (): Promise<void> => {
      setIsLoadingTender(true);
      setLoadError(null);
      try {
        const supabase = createClient();
        const { data: company, error: companyError } = await fetchUserPrimaryCompany(
          supabase,
          user.id,
        );
        if (companyError || !company) {
          setLoadError('Nie znaleziono firmy.');
          return;
        }

        const { data: tender, error } = await fetchTenderById(supabase, duplicateFromId);
        if (error || !tender) {
          setLoadError('Nie znaleziono konkursu do skopiowania.');
          return;
        }

        if (tender.company?.id !== company.id) {
          setLoadError('Brak dostępu do tego konkursu.');
          return;
        }

        setInitialTender(tender);
        const { data: buildingIds } = await fetchContestBuildingIds(supabase, tender.id);
        setLoadedBuildingIds(buildingIds);
      } catch {
        setLoadError('Nie udało się wczytać danych konkursu.');
      } finally {
        setIsLoadingTender(false);
      }
    };

    void loadDuplicate();
  }, [duplicateFromId, tenderId, user?.id]);

  const initialForm = useMemo(() => {
    if (initialTender) {
      const row = initialTender as unknown as Record<string, unknown>;
      const mapped = mapTenderRowToContestForm(
        row,
        initialTender.category?.name,
        initialTender.subcategory?.name,
      );
      return isDuplicateMode ? clearContestFormDates(mapped) : mapped;
    }
    if (tenderId || duplicateFromId) return undefined;
    if (!prefillEntityId && !prefillCategory && !prefillSubcategory) return undefined;
    return {
      ...createEmptyTenderContestForm(),
      managedEntityId: prefillEntityId ?? '',
      category: prefillCategory ?? '',
      subcategory: prefillSubcategory ?? '',
    };
  }, [
    initialTender,
    isDuplicateMode,
    tenderId,
    duplicateFromId,
    prefillEntityId,
    prefillCategory,
    prefillSubcategory,
  ]);

  const initialBuildingIds = useMemo(() => {
    if (loadedBuildingIds.length > 0) return loadedBuildingIds;
    if (prefillBuildingId && !tenderId && !duplicateFromId) return [prefillBuildingId];
    return [];
  }, [loadedBuildingIds, prefillBuildingId, tenderId, duplicateFromId]);

  const existingDocuments = useMemo(
    () => parseExistingTenderDocuments(initialTender?.documents),
    [initialTender],
  );

  const handleSubmit = async (
    form: TenderContestFormData,
    newFiles: File[],
    keptDocuments: TenderContestDocumentMeta[],
    status: 'draft' | 'active',
    buildingIds: string[],
  ): Promise<void> => {
    if (!user?.id) {
      toast.error('Musisz być zalogowany, aby zapisać konkurs');
      return;
    }

    setIsSubmitting(true);
    let keepSubmittingOverlay = false;
    try {
      const supabase = createClient();
      const { data: company, error: companyError } = await fetchUserPrimaryCompany(supabase, user.id);

      if (companyError || !company) {
        toast.error('Nie znaleziono firmy. Uzupełnij dane firmy w profilu.');
        return;
      }

      const uploadFolder = isEditMode && tenderId ? tenderId : 'draft';
      let uploaded: TenderContestDocumentMeta[] = [];

      if (newFiles.length > 0) {
        const uploadResult = await uploadContestDocuments(newFiles, user.id, uploadFolder);
        uploaded = uploadResult.data;

        if (uploadResult.errors.length > 0) {
          if (uploadResult.data.length === 0 && keptDocuments.length === 0) {
            toast.error(
              'Nie udało się wgrać dokumentów. Sprawdź format plików (PDF, DOC, DOCX, XLS, XLSX, obrazy) i spróbuj ponownie.',
            );
            return;
          }
          if (uploadResult.data.length > 0 && uploadResult.data.length < newFiles.length) {
            toast.warning(
              `Wgrano ${uploadResult.data.length} z ${newFiles.length} plików.`,
            );
          } else if (uploadResult.data.length === 0 && keptDocuments.length > 0) {
            toast.warning(
              'Nie udało się wgrać nowych plików. Zapisano z istniejącą dokumentacją.',
            );
          }
        }
      }

      const allDocs = [...keptDocuments, ...uploaded];

      const { payload, error: buildError } = await buildCreateTenderPayload(
        supabase,
        form,
        allDocs,
        user.id,
        company.id,
        company.city,
        company.address,
        status,
      );

      if (buildError || !payload) {
        toast.error(buildError?.message ?? 'Nie udało się przygotować danych konkursu');
        return;
      }

      if (isEditMode && tenderId) {
        const { error: saveError } = await updateTender(
          supabase,
          tenderId,
          contestPayloadToUpsertData(payload),
        );

        if (saveError) {
          toast.error(
            'Nie udało się zapisać konkursu: ' + (saveError.message || 'Nieznany błąd'),
          );
          return;
        }
        const { error: buildingsError } = await replaceContestBuildings(
          supabase,
          tenderId,
          buildingIds,
        );
        if (buildingsError) {
          toast.warning('Konkurs zapisany, ale nie udało się zapisać budynków.');
        }
      } else {
        const createPayload = {
          ...payload,
          ...(isDuplicateMode && duplicateFromId
            ? { renewedFromContestId: duplicateFromId }
            : {}),
        };
        const { data: created, error: saveError } = await createTender(supabase, createPayload);

        if (saveError) {
          toast.error(
            'Nie udało się zapisać konkursu: ' + (saveError.message || 'Nieznany błąd'),
          );
          return;
        }
        if (created?.id) {
          const { error: buildingsError } = await replaceContestBuildings(
            supabase,
            created.id,
            buildingIds,
          );
          if (buildingsError) {
            toast.warning('Konkurs zapisany, ale nie udało się zapisać budynków.');
          }
        }
      }

      if (status === 'active' && !isEditMode) {
        posthog.capture('contest_created', {
          category: form.category,
          subcategory: form.subcategory,
          is_duplicate: isDuplicateMode,
        });
      }
      toast.success(
        status === 'draft'
          ? isEditMode
            ? 'Szkic konkursu został zapisany'
            : 'Konkurs zapisany jako szkic'
          : 'Konkurs został opublikowany',
      );

      if (status === 'active') {
        keepSubmittingOverlay = true;
        setIsRedirectingAfterPublish(true);
        router.push('/panel-zarzadcy/konkursy');
        return;
      }

      router.push('/panel-zarzadcy/konkursy');
    } catch (error) {
      console.error('Error saving contest:', error);
      toast.error('Wystąpił błąd podczas zapisywania konkursu');
    } finally {
      if (!keepSubmittingOverlay) {
        setIsSubmitting(false);
      }
    }
  };

  if (!isLoading && !user && !session) {
    return <></>;
  }

  if (isLoadingTender) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Ładowanie konkursu…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
          <p className="text-muted-foreground">{loadError}</p>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Wróć do listy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {(isSubmitting || isRedirectingAfterPublish) && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isRedirectingAfterPublish ? 'Przekierowywanie do listy konkursów…' : 'Zapisywanie konkursu…'}
          </p>
        </div>
      )}
      {!hidePageHeader ? (
        <TenderContestPageHeader
          onBack={onBack}
          backLabel={backLabel}
          title={
            isEditMode
              ? 'Kontynuuj konkurs ofert'
              : isDuplicateMode
                ? 'Konkurs z nowymi terminami'
                : undefined
          }
          subtitle={
            isEditMode
              ? 'Uzupełnij brakujące pola i zapisz szkic lub opublikuj konkurs.'
              : isDuplicateMode
                ? 'Dane konkursu zostały skopiowane. Uzupełnij terminy i opublikuj nową edycję.'
                : undefined
          }
        />
      ) : (
        <div className="border-b border-border/60 bg-background">
          <div className="mx-auto max-w-4xl px-4 pb-5 pt-6 sm:pb-6 sm:pt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Konkurs ofert
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {isDuplicateMode
                ? 'Konkurs z nowymi terminami'
                : pageTitle ?? 'Nowy konkurs'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {isDuplicateMode
                ? 'Dane konkursu zostały skopiowane. Uzupełnij terminy i opublikuj nową edycję.'
                : pageSubtitle ??
                  'Uzupełnij zakres, terminy składania ofert i wymagania formalne.'}
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          'mx-auto max-w-4xl px-4 pb-28 lg:pb-8',
          hidePageHeader ? 'py-4 sm:py-6' : 'py-6 sm:py-8',
        )}
      >
        {hidePageHeader ? (
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm shadow-black/[0.03]">
            <TenderContestForm
              layout="create"
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting || isRedirectingAfterPublish}
              initialForm={initialForm}
              existingDocuments={existingDocuments}
              initialBuildingIds={initialBuildingIds}
            />
          </div>
        ) : (
          <TenderContestForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting || isRedirectingAfterPublish}
            initialForm={initialForm}
            existingDocuments={existingDocuments}
            initialBuildingIds={initialBuildingIds}
          />
        )}
      </div>
    </div>
  );
}
