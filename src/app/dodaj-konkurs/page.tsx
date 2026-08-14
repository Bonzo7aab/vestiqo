'use client';

import { Suspense, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TenderCreationPage from '../../components/TenderCreationPage';
import { parseContestPrefillSearchParams } from '../../lib/calendar/contest-prefill';

function PostContestPageContent(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get('duplicateFrom') ?? undefined;
  const prefill = parseContestPrefillSearchParams(searchParams);

  return (
    <TenderCreationPage
      onBack={() => router.push('/panel-zarzadcy/konkursy')}
      duplicateFromId={duplicateFrom}
      hidePageHeader
      pageTitle="Nowy konkurs"
      pageSubtitle="Uzupełnij zakres, terminy składania ofert i wymagania formalne."
      prefillEntityId={prefill.entityId}
      prefillBuildingId={prefill.buildingId}
      prefillCategory={prefill.categoryFilterKey}
      prefillSubcategory={prefill.subcategoryFilterKey}
    />
  );
}

export default function PostContestPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-muted/30 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Ładowanie formularza…</p>
        </div>
      }
    >
      <PostContestPageContent />
    </Suspense>
  );
}
