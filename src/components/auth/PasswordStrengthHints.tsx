'use client';

import { Check, Circle, CircleAlert } from 'lucide-react';
import { cn } from '../ui/utils';
import {
  getPasswordConstraints,
  PASSWORD_MISMATCH_MESSAGE,
} from '../../lib/auth/password-policy';

interface PasswordStrengthHintsProps {
  password: string;
}

export function PasswordStrengthHints({ password }: PasswordStrengthHintsProps) {
  if (!password) {
    return null;
  }

  const constraints = getPasswordConstraints(password);

  return (
    <ul
      id="password-strength-hints"
      className="flex flex-wrap items-center gap-x-3 gap-y-1"
      data-testid="password-strength-hints"
      aria-label="Wymagania hasła"
    >
      {constraints.map(constraint => (
        <li
          key={constraint.id}
          className={cn(
            'inline-flex items-center gap-1 text-[11px] leading-4',
            constraint.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
          data-met={constraint.met ? 'true' : 'false'}
        >
          {constraint.met ? (
            <Check className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <Circle className="h-2.5 w-2.5 shrink-0" aria-hidden />
          )}
          {constraint.label}
        </li>
      ))}
    </ul>
  );
}

interface PasswordMismatchHintProps {
  visible: boolean;
  id?: string;
}

export function PasswordMismatchHint({ visible, id }: PasswordMismatchHintProps) {
  if (!visible) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      data-testid="password-mismatch-hint"
      className="inline-flex items-center gap-1 text-[11px] leading-4 text-destructive"
    >
      <CircleAlert className="h-3 w-3 shrink-0" aria-hidden />
      {PASSWORD_MISMATCH_MESSAGE}
    </p>
  );
}
