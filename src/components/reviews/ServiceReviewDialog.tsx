'use client';

import type { ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ServiceReviewPanel } from './ServiceReviewPanel';

interface ServiceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  contractorCompanyId: string;
  contractorName: string;
  onSubmitted?: () => void;
}

export function ServiceReviewDialog({
  open,
  onOpenChange,
  jobId,
  contractorCompanyId,
  contractorName,
  onSubmitted,
}: ServiceReviewDialogProps): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Oceń konkurs</DialogTitle>
          <DialogDescription>
            Oceń realizację konkursu przez {contractorName} — gwiazdki, komentarz i opcjonalne
            zdjęcia.
          </DialogDescription>
        </DialogHeader>
        <ServiceReviewPanel
          jobId={jobId}
          contractorCompanyId={contractorCompanyId}
          contractorName={contractorName}
          onCancel={() => onOpenChange(false)}
          onSubmitted={() => {
            onSubmitted?.();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
