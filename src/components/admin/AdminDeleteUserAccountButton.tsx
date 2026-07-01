'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { adminDeleteUserAccountAction } from '../../app/administracja/actions';

interface AdminDeleteUserAccountButtonProps {
  userId: string;
  userLabel: string;
  /** After delete, navigate here (defaults to verification queue). */
  redirectTo?: string;
  variant?: 'destructive' | 'outline';
  size?: 'default' | 'sm';
  className?: string;
}

export function AdminDeleteUserAccountButton({
  userId,
  userLabel,
  redirectTo = '/administracja/weryfikacja',
  variant = 'outline',
  size = 'sm',
  className,
}: AdminDeleteUserAccountButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const result = await adminDeleteUserAccountAction(userId);

      if (!result.ok) {
        setError(result.error ?? 'Nie udało się usunąć konta.');
        setBusy(false);
        return;
      }

      toast.success('Konto zostało trwale usunięte.');
      setOpen(false);
      setBusy(false);
      router.replace(redirectTo);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Wystąpił błąd podczas usuwania konta.');
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={busy}
          className={className}
        >
          <Trash2 className="h-4 w-4" />
          Usuń konto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Usunąć konto użytkownika?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 pt-2">
              <p>
                Czy na pewno chcesz trwale usunąć konto <strong>{userLabel}</strong>? Ta operacja
                jest nieodwracalna i usunie:
              </p>
              <ul className="ml-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>konto logowania (email i hasło)</li>
                <li>profil użytkownika i powiązaną firmę (NIP, REGON itd.)</li>
                <li>dokumenty weryfikacyjne i ustawienia konta</li>
                <li>pozostałe dane powiązane z tym użytkownikiem w bazie</li>
              </ul>
              <p className="pt-2 font-medium text-destructive">Tej akcji nie można cofnąć.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={busy}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {busy ? 'Usuwanie…' : 'Tak, usuń konto'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
