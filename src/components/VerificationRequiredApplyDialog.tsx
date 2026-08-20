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
import { CONTRACTOR_VERIFICATION_DOCUMENTS_PATH } from '../lib/verification/documents-route';

interface VerificationRequiredApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when the contractor already submitted OC and is waiting for admin. */
  ocSubmitted?: boolean;
}

/**
 * Shown when an unverified contractor tries to submit an offer.
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
            {ocSubmitted ? 'Polisa OC oczekuje na akceptację' : 'Dodaj polisę OC'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Twoje konto oczekuje na weryfikację przez administratora. Składanie ofert jest
                tymczasowo zablokowane.
              </p>
              {ocSubmitted ? (
                <p>
                  Polisa OC została przesłana. Konto czeka na akceptację administratora — po niej
                  składanie ofert będzie odblokowane.
                </p>
              ) : (
                <p>
                  Dodaj polisę OC, jeśli jeszcze tego nie zrobiłeś — przyspieszy to proces
                  weryfikacji.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              router.push(CONTRACTOR_VERIFICATION_DOCUMENTS_PATH);
            }}
          >
            {ocSubmitted ? 'Zobacz dokumenty' : 'Dodaj polisę OC'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
