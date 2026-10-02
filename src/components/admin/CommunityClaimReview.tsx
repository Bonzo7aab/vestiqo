'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { CommunityAccountClaimQueueItem } from '../../lib/database/community-account-claims';
import { claimSlaLabel } from '../../lib/database/community-account-claims';
import {
  approveCommunityClaimAction,
  getCommunityClaimResolutionUrlAction,
  rejectCommunityClaimAction,
} from '../../app/administracja/odzyskanie-wspolnoty/actions';

interface CommunityClaimReviewProps {
  claim: CommunityAccountClaimQueueItem;
}

export function CommunityClaimReview({ claim }: CommunityClaimReviewProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isPendingClaim = claim.status === 'pending';

  const openResolution = () => {
    setPreviewError(null);
    startTransition(async () => {
      const result = await getCommunityClaimResolutionUrlAction(claim.id);
      if (!result.url) {
        setPreviewError(result.error ?? 'Brak pliku uchwały.');
        return;
      }
      window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  };

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveCommunityClaimAction(claim.id);
      if (!result.ok) {
        setError(result.error ?? 'Nie udało się zaakceptować wniosku.');
        return;
      }
      router.push('/administracja/odzyskanie-wspolnoty');
      router.refresh();
    });
  };

  const reject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectCommunityClaimAction(claim.id, reason);
      if (!result.ok) {
        setError(result.error ?? 'Nie udało się odrzucić wniosku.');
        return;
      }
      router.push('/administracja/odzyskanie-wspolnoty');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{claim.entityName}</h2>
          <p className="text-sm text-muted-foreground">
            NIP {claim.nip}
            {claim.managerCompanyName ? ` · Zarządca: ${claim.managerCompanyName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPendingClaim && claim.isOverdue ? (
            <Badge variant="destructive">{claimSlaLabel(claim)}</Badge>
          ) : (
            <Badge variant="secondary">{claimSlaLabel(claim)}</Badge>
          )}
          <Badge variant={claim.status === 'pending' ? 'outline' : 'secondary'}>
            {claim.status === 'pending'
              ? 'W toku'
              : claim.status === 'approved'
                ? 'Zaakceptowany'
                : 'Odrzucony'}
          </Badge>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Wnioskodawca</p>
          <p className="mt-1 font-medium">
            {claim.first_name} {claim.last_name}
          </p>
          <p className="text-sm text-muted-foreground">{claim.email}</p>
          <p className="text-sm text-muted-foreground">{claim.phone}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Uchwała</p>
          <div className="mt-2 flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={openResolution} disabled={isPending}>
              Otwórz PDF uchwały
            </Button>
            {previewError ? <p className="text-sm text-destructive">{previewError}</p> : null}
          </div>
        </div>
      </section>

      {isPendingClaim ? (
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Powód odrzucenia (wymagany przy odrzuceniu)</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isPending}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={approve} disabled={isPending}>
              Akceptuj i utwórz konto
            </Button>
            <Button type="button" variant="destructive" onClick={reject} disabled={isPending}>
              Odrzuć
            </Button>
          </div>
        </section>
      ) : claim.reject_reason ? (
        <Alert>
          <AlertDescription>
            <strong>Powód odrzucenia:</strong> {claim.reject_reason}
          </AlertDescription>
        </Alert>
      ) : null}

      <Link href="/administracja/odzyskanie-wspolnoty" className="text-sm text-primary hover:underline">
        Wróć do kolejki
      </Link>
    </div>
  );
}
