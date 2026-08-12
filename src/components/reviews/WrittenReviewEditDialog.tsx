'use client';

import type { ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { WrittenReviewEditPanel } from './WrittenReviewEditPanel';

interface WrittenReviewEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  counterpartyName: string;
  initialRating: number;
  initialComment: string;
  onSaved?: (updated: { rating: number; comment: string }) => void;
}

export function WrittenReviewEditDialog({
  open,
  onOpenChange,
  reviewId,
  counterpartyName,
  initialRating,
  initialComment,
  onSaved,
}: WrittenReviewEditDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edytuj ocenę</DialogTitle>
          <DialogDescription>
            Zaktualizuj ocenę wystawioną dla {counterpartyName}.
          </DialogDescription>
        </DialogHeader>
        <WrittenReviewEditPanel
          key={reviewId}
          reviewId={reviewId}
          counterpartyName={counterpartyName}
          initialRating={initialRating}
          initialComment={initialComment}
          onCancel={() => onOpenChange(false)}
          onSaved={(updated) => {
            onSaved?.(updated);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
