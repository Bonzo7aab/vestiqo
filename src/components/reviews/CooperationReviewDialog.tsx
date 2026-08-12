'use client';

import type { ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  CooperationReviewPanel,
  type CooperationReviewVariant,
} from './CooperationReviewPanel';

export type { CooperationReviewVariant };

interface CooperationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: CooperationReviewVariant;
  tenderId: string;
  counterpartyCompanyId: string;
  counterpartyCompanyName: string;
  /** When true, dialog title is "Ocena współpracy" (edit existing review). */
  isEditing?: boolean;
  onSubmitted?: (updated: { rating: number; comment: string }) => void;
}

export function CooperationReviewDialog({
  open,
  onOpenChange,
  variant,
  tenderId,
  counterpartyCompanyId,
  counterpartyCompanyName,
  isEditing = false,
  onSubmitted,
}: CooperationReviewDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Ocena współpracy' : 'Oceń współpracę'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Zaktualizuj ocenę współpracy z ${counterpartyCompanyName}.`
              : `Oceń współpracę z ${counterpartyCompanyName} po zakończeniu konkursu.`}
          </DialogDescription>
        </DialogHeader>
        <CooperationReviewPanel
          variant={variant}
          tenderId={tenderId}
          counterpartyCompanyId={counterpartyCompanyId}
          counterpartyCompanyName={counterpartyCompanyName}
          onCancel={() => onOpenChange(false)}
          onSubmitted={(updated) => {
            onSubmitted?.(updated);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
