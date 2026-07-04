'use client';

import React, { useTransition } from 'react';
import { Eye, List } from 'lucide-react';
import { toast } from 'sonner';
import {
  startImpersonationAction,
  type ImpersonationView,
} from '../../app/administracja/impersonation/actions';
import { Button } from '../ui/button';

interface AdminImpersonateButtonsProps {
  subjectUserId: string;
  userType: string;
  disabled?: boolean;
  compact?: boolean;
}

export function AdminImpersonateButtons({
  subjectUserId,
  userType,
  disabled = false,
  compact = false,
}: AdminImpersonateButtonsProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const isManager = userType === 'manager';

  const handleStart = (view: ImpersonationView): void => {
    startTransition(async () => {
      const result = await startImpersonationAction(subjectUserId, view);
      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'sm' : 'default'}
        disabled={disabled || isPending}
        onClick={() => handleStart('konto')}
        className={compact ? 'h-7 gap-1 px-2 text-xs' : undefined}
      >
        <Eye className={compact ? 'h-3.5 w-3.5' : undefined} />
        {compact ? 'Podgląd' : 'Podgląd jako użytkownik'}
      </Button>
      {isManager ? (
        <Button
          type="button"
          variant="outline"
          size={compact ? 'sm' : 'default'}
          disabled={disabled || isPending}
          onClick={() => handleStart('konkursy')}
          className={compact ? 'h-7 gap-1 px-2 text-xs' : undefined}
        >
          <List className={compact ? 'h-3.5 w-3.5' : undefined} />
          {compact ? 'Konkursy' : 'Otwórz konkursy'}
        </Button>
      ) : null}
    </>
  );
}
