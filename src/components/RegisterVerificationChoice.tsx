'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Clock, FileCheck, Shield } from 'lucide-react';
import { useUserProfile } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CONTRACTOR_VERIFICATION_DOCUMENTS_PATH } from '../lib/verification/documents-route';

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">Ładowanie...</p>
      </div>
    </div>
  );
}

/**
 * Shown right after contractor registration: upload verification documents now or later.
 */
export function RegisterVerificationChoice() {
  const { user, isLoading, isAuthenticated } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams?.get('message');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/logowanie?redirectTo=/rejestracja/wybor-weryfikacji');
      return;
    }
    if (user && user.userType !== 'contractor') {
      router.replace('/konto');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || !user || user.userType !== 'contractor') {
    return <LoadingState />;
  }

  return (
    <div
      className="min-h-screen bg-slate-50 py-12 sm:py-16"
      data-testid="register-verification-choice"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          {message && (
            <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/5">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Konto zostało utworzone</h1>
            <p className="mt-2 text-sm text-slate-600">
              Możesz od razu przesłać dokumenty do weryfikacji albo wrócić do tego później w
              zakładce Dokumenty na koncie.
            </p>
          </div>

          <div className="space-y-3">
            <Card
              className="border-primary/25 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => router.push(CONTRACTOR_VERIFICATION_DOCUMENTS_PATH)}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h2 className="font-semibold text-slate-900">Prześlij dokumenty teraz</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Polisa OC i opcjonalne załączniki. Weryfikacja trwa zwykle 1–3 dni robocze.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-primary mt-1" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900">Zrobię to później</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Przeglądaj konkursy już teraz. Dokumenty uzupełnisz w menu konta pod pozycją
                    „Dokończ weryfikację”.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => router.push('/')}
                  >
                    Przejdź do ofert
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
