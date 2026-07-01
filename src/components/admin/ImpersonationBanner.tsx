'use client';

import React, { useTransition } from 'react';
import { Eye, X } from 'lucide-react';
import { endImpersonationAction } from '../../app/administracja/impersonation/actions';
import { subjectUserTypeLabel } from '../../lib/admin/impersonation';
import { useImpersonation } from '../../contexts/ImpersonationContext';
import { Button } from '../ui/button';

export function ImpersonationBanner(): React.ReactElement | null {
  const { isImpersonating, subjectDisplayName, subjectUserType, subjectUserId } =
    useImpersonation();
  const [isPending, startTransition] = useTransition();

  if (!isImpersonating || !subjectDisplayName || !subjectUserType) {
    return null;
  }

  const handleEnd = (): void => {
    startTransition(() => {
      void endImpersonationAction(subjectUserId ?? undefined);
    });
  };

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Podglądasz konto:{' '}
            <span className="font-semibold">{subjectDisplayName}</span> (
            {subjectUserTypeLabel(subjectUserType)}). Tryb tylko do odczytu.
          </span>
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-400 bg-white hover:bg-amber-100"
          disabled={isPending}
          onClick={handleEnd}
        >
          <X className="h-4 w-4" />
          Zakończ podgląd
        </Button>
      </div>
    </div>
  );
}
