'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TenderCreationPage from '../../components/TenderCreationPage';

function PostContestPageContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get('duplicateFrom') ?? undefined;

  return (
    <TenderCreationPage
      onBack={() => router.push('/panel-zarzadcy/konkursy')}
      duplicateFromId={duplicateFrom}
      hidePageHeader
      pageTitle="Nowy konkurs"
      pageSubtitle="Uzupełnij zakres, terminy składania ofert i wymagania formalne."
    />
  );
}

export default function PostContestPage(): React.ReactElement {
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
