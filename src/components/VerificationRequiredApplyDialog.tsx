'use client';

import { useRouter } from 'next/navigation';
import { FileWarning } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface VerificationRequiredApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when the contractor already submitted and is waiting for review. */
  ocSubmitted?: boolean;
}

/**
 * Shown when an unverified contractor tries to submit an offer.
 * Account access is gated by registry / admin verification (OPD-118), not polisa OC.
 */
export function VerificationRequiredApplyDialog({
  open,
  onOpenChange,
  ocSubmitted = false,
}: VerificationRequiredApplyDialogProps) {
  const router = useRouter();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-600" />
            {ocSubmitted ? 'Weryfikacja konta w toku' : 'Konto wymaga weryfikacji'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Składanie ofert jest dostępne po weryfikacji firmy w rejestrach (CEIDG/KRS).
                Do tego czasu oferty są tymczasowo zablokowane.
              </p>
              {ocSubmitted ? (
                <p>Twoje konto oczekuje na zakończenie weryfikacji — po niej składanie ofert będzie odblokowane.</p>
              ) : (
                <p>Sprawdź status weryfikacji na koncie. Jeśli dane rejestrowe są nieaktualne, zaktualizuj NIP i dane firmy.</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              router.push('/konto');
            }}
          >
            Przejdź do konta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
