'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Flag, Info, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  getAdminFeatureFlagsAction,
  setAdminFeatureFlagAction,
} from '../../app/administracja/flagship-actions';
import type { AdminFeatureFlagsSnapshot } from '../../lib/flagship/admin-flags';
import {
  FLAGSHIP_FLAG_DESCRIPTIONS,
  FLAGSHIP_FLAG_LABELS,
  type FlagshipFlagKey,
} from '../../lib/flagship/keys';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { cn } from '../ui/utils';

const FLAGSHIP_DASHBOARD_URL = 'https://dash.cloudflare.com/?to=/:account/workers/flagship';

interface AdminFeatureFlagsPanelProps {
  initial: AdminFeatureFlagsSnapshot;
}

interface PendingToggle {
  key: FlagshipFlagKey;
  enabled: boolean;
}

export function AdminFeatureFlagsPanel({ initial }: AdminFeatureFlagsPanelProps) {
  const [snapshot, setSnapshot] = useState(initial);
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);
  const [isPending, startTransition] = useTransition();

  const switchesDisabled = !snapshot.configured || !snapshot.canWrite || isPending;
  const isProduction = snapshot.environment === 'production';

  const applyToggle = (key: FlagshipFlagKey, enabled: boolean) => {
    startTransition(async () => {
      const result = await setAdminFeatureFlagAction(key, enabled);
      if (result.ok && result.snapshot) {
        setSnapshot(result.snapshot);
        toast.success(
          enabled
            ? `Włączono flagę ${FLAGSHIP_FLAG_LABELS[key]}`
            : `Wyłączono flagę ${FLAGSHIP_FLAG_LABELS[key]}`,
        );
      } else {
        toast.error(result.error ?? 'Nie udało się zapisać flagi');
        if (result.error?.includes('Flagship Write')) {
          setSnapshot((current) => ({ ...current, canWrite: false, error: result.error }));
        }
      }
    });
  };

  const requestToggle = (key: FlagshipFlagKey, enabled: boolean) => {
    if (isProduction) {
      setPendingToggle({ key, enabled });
      return;
    }
    applyToggle(key, enabled);
  };

  const refresh = () => {
    startTransition(async () => {
      const next = await getAdminFeatureFlagsAction();
      setSnapshot(next);
    });
  };

  return (
    <div className="space-y-4">
      <Alert
        className={cn(
          isProduction
            ? 'border-amber-200/80 bg-amber-50/70 text-amber-950 [&>svg]:text-amber-800'
            : 'border-primary/15 bg-primary/5 [&>svg]:text-primary',
        )}
      >
        {isProduction ? <AlertTriangle /> : <Info />}
        <AlertTitle className="flex flex-wrap items-center justify-start gap-x-4 gap-y-1.5 line-clamp-none">
          <span className="mr-1">Edytujesz flagi środowiska</span>
          <Badge
            variant="outline"
            className={cn(
              'font-medium',
              isProduction
                ? 'border-amber-200 bg-amber-100 text-amber-900'
                : 'border-primary/20 bg-background text-primary',
            )}
          >
            {snapshot.environmentLabel}
          </Badge>
        </AlertTitle>
        <AlertDescription>
          {isProduction
            ? 'Zmiany są widoczne dla użytkowników vestiqo.pl. Preview ma osobny zestaw flag.'
            : 'Zmiana dotyczy tylko tego środowiska. Preview i produkcja mają osobne zestawy flag.'}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Feature flags
              </CardTitle>
              <CardDescription>
                Włączenie lub wyłączenie może być widoczne u użytkowników z opóźnieniem do ok. 30
                sekund (propagacja Flagship).
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={refresh} disabled={isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
                Odśwież
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={FLAGSHIP_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
                  Cloudflare Flagship
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{snapshot.error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Ostatnia ewaluacja: {new Date(snapshot.evaluatedAt).toLocaleString('pl-PL')}
          </p>

          <div className="space-y-3">
            {snapshot.flags.map((flag) => {
              const disabled = switchesDisabled || flag.missing;
              return (
                <div
                  key={flag.key}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={`flag-${flag.key}`}>{FLAGSHIP_FLAG_LABELS[flag.key]}</Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          flag.enabled
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800',
                        )}
                      >
                        {flag.missing ? 'Brak w appie' : flag.enabled ? 'Włączona' : 'Wyłączona'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {FLAGSHIP_FLAG_DESCRIPTIONS[flag.key]}
                    </p>
                    <code className="text-xs text-muted-foreground">{flag.key}</code>
                    {flag.evaluationMismatch ? (
                      <p className="text-xs text-amber-800">
                        Flaga jest włączona, ale ewaluacja dla Twojego konta zwraca false
                        (default/targeting).
                      </p>
                    ) : null}
                    {flag.missing ? (
                      <p className="text-xs text-muted-foreground">
                        Utwórz tę flagę w Cloudflare Flagship (ta sama app co FLAGSHIP_APP_ID).
                      </p>
                    ) : null}
                  </div>
                  <Switch
                    id={`flag-${flag.key}`}
                    checked={flag.enabled}
                    disabled={disabled}
                    onCheckedChange={(checked) => requestToggle(flag.key, checked)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingToggle !== null}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmienić flagę na produkcji?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle
                ? `To zmieni „${FLAGSHIP_FLAG_LABELS[pendingToggle.key]}” dla użytkowników vestiqo.pl. Propagacja może zająć do ok. 30 sekund.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingToggle) return;
                const next = pendingToggle;
                setPendingToggle(null);
                applyToggle(next.key, next.enabled);
              }}
            >
              Potwierdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
