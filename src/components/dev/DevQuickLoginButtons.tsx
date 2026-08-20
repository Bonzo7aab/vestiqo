'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useUserProfile } from '../../contexts/AuthContext';
import { devQuickLoginAction } from '../../lib/auth/actions';
import {
  DEV_QUICK_LOGIN_ACCOUNT_OPTIONS,
  type DevQuickLoginAccountKey,
} from '../../lib/auth/dev-quick-login';
import { cn } from '../ui/utils';

interface DevQuickLoginButtonsProps {
  className?: string;
}

export function DevQuickLoginButtons({ className }: DevQuickLoginButtonsProps) {
  const router = useRouter();
  const { refreshSession } = useUserProfile();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<DevQuickLoginAccountKey | null>(
    null,
  );

  const handleLogin = (accountKey: DevQuickLoginAccountKey) => {
    setPendingKey(accountKey);
    startTransition(async () => {
      const result = await devQuickLoginAction(accountKey);
      if ('error' in result) {
        toast.error(result.error);
        setPendingKey(null);
        return;
      }

      await refreshSession();
      router.refresh();
      router.push(result.redirectTo);
      setPendingKey(null);
    });
  };

  return (
    <div
      className={cn(
        'border-t bg-amber-50/70 px-2 py-2 dark:bg-amber-950/30',
        className,
      )}
    >
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
        Dev — szybkie logowanie
      </p>
      <div className="grid grid-cols-2 gap-1">
        {DEV_QUICK_LOGIN_ACCOUNT_OPTIONS.map((account) => {
          const isThisPending = isPending && pendingKey === account.key;
          return (
            <Button
              key={account.key}
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => handleLogin(account.key)}
              className={cn(
                'h-8 justify-start px-2 text-xs font-medium',
                account.key === 'admin' && 'col-span-2',
              )}
            >
              {isThisPending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : null}
              {account.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
