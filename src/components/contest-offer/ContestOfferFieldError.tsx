'use client';

import type { ReactElement, ReactNode } from 'react';
import { Label } from '../ui/label';
import { cn } from '../ui/utils';

interface ContestOfferFieldErrorProps {
  message?: string;
  className?: string;
}

export function ContestOfferFieldError({
  message,
  className,
}: ContestOfferFieldErrorProps): ReactElement | null {
  if (!message) return null;

  return (
    <p role="alert" className={cn('text-sm text-destructive mt-1.5', className)}>
      {message}
    </p>
  );
}

export function fieldErrorInputClass(hasError: boolean): string {
  return hasError ? 'border-destructive focus-visible:ring-destructive/30' : '';
}

interface ContestOfferRequiredLabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function ContestOfferRequiredLabel({
  htmlFor,
  children,
  className,
}: ContestOfferRequiredLabelProps): ReactElement {
  return (
    <Label
      htmlFor={htmlFor}
      className={cn('inline-flex items-baseline gap-0.5 text-sm font-semibold text-foreground', className)}
    >
      {children}
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    </Label>
  );
}

interface ContestOfferOptionalLabelProps {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function ContestOfferOptionalLabel({
  htmlFor,
  children,
  className,
}: ContestOfferOptionalLabelProps): ReactElement {
  return (
    <Label htmlFor={htmlFor} className={cn('text-sm font-medium text-foreground', className)}>
      {children}
      <span className="ml-1.5 text-xs font-normal text-muted-foreground">(opcjonalnie)</span>
    </Label>
  );
}
