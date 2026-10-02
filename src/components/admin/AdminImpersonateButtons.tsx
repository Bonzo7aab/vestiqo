'use client';

import React, { useTransition } from 'react';
import { UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { startImpersonationAction } from '../../app/administracja/impersonation/actions';
import { Button } from '../ui/button';

interface AdminImpersonateButtonsProps {
  subjectUserId: string;
  disabled?: boolean;
  compact?: boolean;
}

export function AdminImpersonateButtons({
  subjectUserId,
  disabled = false,
  compact = false,
}: AdminImpersonateButtonsProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();

  const handleStart = (): void => {
    startTransition(async () => {
      const result = await startImpersonationAction(subjectUserId);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? 'sm' : 'default'}
      disabled={disabled || isPending}
      onClick={handleStart}
      className={compact ? 'h-7 gap-1 px-2 text-xs' : undefined}
    >
      <UserRound className={compact ? 'h-3.5 w-3.5' : undefined} />
      Podgląd konta
    </Button>
  );
}
