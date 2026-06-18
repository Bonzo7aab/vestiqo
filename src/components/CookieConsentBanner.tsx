'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Cookie } from 'lucide-react';
import { CookieSettingsDialog, useCookieSettingsDialog } from './CookieSettingsDialog';
import { hasCookieConsentChoice, saveCookiePreferences } from '../lib/cookie-consent';
import { routes } from '../lib/routes';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !hasCookieConsentChoice();
  });
  const { open, setOpen } = useCookieSettingsDialog();

  const handleAcceptAll = () => {
    saveCookiePreferences({ functional: true, analytics: true });
    setShowBanner(false);
  };

  const handleRejectOptional = () => {
    saveCookiePreferences({ functional: false, analytics: false });
    setShowBanner(false);
  };

  return (
    <>
      {showBanner ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-2 md:p-3 pointer-events-none">
          <Card className="max-w-4xl mx-auto shadow-lg border-2 pointer-events-auto gap-1">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-2">
                <Cookie className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <CardTitle className="text-base">Pliki cookies</CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    Ta strona wykorzystuje pliki cookies
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xs text-slate-600 leading-snug">
                Używamy plików cookies niezbędnych do działania platformy oraz — za Twoją zgodą —
                do zapamiętywania preferencji i analizy ruchu.{' '}
                <Link
                  href={routes.ustawieniaPlikowCookie}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Więcej informacji
                </Link>
                .
              </p>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={handleAcceptAll}
                size="sm"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                Akceptuję wszystkie
              </Button>
              <Button
                onClick={handleRejectOptional}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                Tylko niezbędne
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}

      <CookieSettingsDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => setShowBanner(false)}
      />
    </>
  );
}
