'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  COOKIE_CONSENT_UPDATED_EVENT,
  COOKIE_SETTINGS_EVENT,
  readCookiePreferences,
  saveCookiePreferences,
  type CookiePreferences,
} from '../lib/cookie-consent';
import { routes } from '../lib/routes';

interface CookieSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function CookieSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: CookieSettingsDialogProps) {
  function handleAcceptAll() {
    saveCookiePreferences({ functional: true, analytics: true });
    onSaved?.();
    onOpenChange(false);
  }

  function handleRejectOptional() {
    saveCookiePreferences({ functional: false, analytics: false });
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-[hsl(var(--brand-navy))]" />
            <DialogTitle>Pliki cookies</DialogTitle>
          </div>
          <DialogDescription>
            Używamy plików cookies niezbędnych do działania platformy oraz — za Twoją zgodą —
            do zapamiętywania preferencji i analizy ruchu. Szczegóły na{' '}
            <Link href={routes.ustawieniaPlikowCookie} className="text-primary hover:underline">
              stronie informacji o cookies
            </Link>
            .
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleAcceptAll} className="w-full">
            Akceptuję wszystkie
          </Button>
          <Button variant="outline" onClick={handleRejectOptional} className="w-full">
            Tylko niezbędne
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useCookieSettingsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  return { open, setOpen };
}

function describePreferences(preferences: CookiePreferences): string {
  if (preferences.functional && preferences.analytics) {
    return 'Akceptujesz wszystkie pliki cookie.';
  }
  return 'Akceptujesz tylko niezbędne pliki cookie.';
}

export function CookiePreferencesSummary() {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const preferences = readCookiePreferences();
      setSummary(preferences ? describePreferences(preferences) : null);
    };
    refresh();
    window.addEventListener(COOKIE_CONSENT_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(COOKIE_CONSENT_UPDATED_EVENT, refresh);
  }, []);

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        Nie wybrano jeszcze preferencji dotyczących plików cookie.
      </p>
    );
  }

  return <p className="text-sm text-muted-foreground">{summary}</p>;
}
