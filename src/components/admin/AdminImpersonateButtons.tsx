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
}

export function AdminImpersonateButtons({
  subjectUserId,
  userType,
  disabled = false,
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
        disabled={disabled || isPending}
        onClick={() => handleStart('konto')}
      >
        <Eye className="h-4 w-4" />
        Podgląd jako użytkownik
      </Button>
      {isManager ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isPending}
          onClick={() => handleStart('konkursy')}
        >
          <List className="h-4 w-4" />
          Otwórz konkursy
        </Button>
      ) : null}
    </>
  );
}
