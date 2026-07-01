'use client';

import { Button } from '../ui/button';
import { CookiePreferencesSummary } from '../CookieSettingsDialog';
import { openCookieSettings } from '../../lib/cookie-consent';
import { cookiesPageContent } from '../../lib/content/cookies';

export function CookieSettingsPageActions() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-6">
      <h2 className="text-lg font-semibold text-brand-navy">
        Twoje aktualne ustawienia
      </h2>
      <div className="mt-3">
        <CookiePreferencesSummary />
      </div>
      <Button type="button" className="mt-4" onClick={openCookieSettings}>
        Zmień ustawienia plików cookie
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">{cookiesPageContent.manageHint}</p>
    </div>
  );
}
