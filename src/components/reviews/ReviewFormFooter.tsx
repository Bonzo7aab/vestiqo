import type { ReactElement } from 'react';
import { Button } from '../ui/button';
import { DialogFooter } from '../ui/dialog';

interface ReviewFormFooterProps {
  onCancel?: () => void;
  onSubmit: () => void;
  submitting: boolean;
  disabled: boolean;
  submitLabel: string;
}

export function ReviewFormFooter({
  onCancel,
  onSubmit,
  submitting,
  disabled,
  submitLabel,
}: ReviewFormFooterProps): ReactElement {
  return (
    <DialogFooter>
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Anuluj
        </Button>
      ) : null}
      <Button type="button" onClick={onSubmit} disabled={disabled || submitting}>
        {submitting ? 'Zapisywanie…' : submitLabel}
      </Button>
    </DialogFooter>
  );
}
