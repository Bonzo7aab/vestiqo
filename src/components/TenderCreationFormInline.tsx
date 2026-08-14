'use client';

import React, { useMemo, useState } from 'react';
import { TenderContestForm } from './tender-creation/TenderContestForm';
import type { TenderWithCompany } from '../lib/database/jobs';
import type { TenderContestDocumentMeta, TenderContestFormData } from '../types/tender-contest';
import {
  mapTenderRowToContestForm,
  parseExistingTenderDocuments,
} from '../lib/contest/build-tender-payload';

interface TenderCreationFormInlineProps {
  onClose: () => void;
  onSubmit: (
    form: TenderContestFormData,
    newFiles: File[],
    keptDocuments: TenderContestDocumentMeta[],
    status: 'draft' | 'active',
    buildingIds: string[],
  ) => void | Promise<void>;
  tenderId?: string;
  initialData?: TenderWithCompany;
  isSubmitting?: boolean;
}

export function TenderCreationFormInline({
  onSubmit,
  initialData,
  isSubmitting = false,
}: TenderCreationFormInlineProps): React.ReactElement {
  const initialForm = useMemo(() => {
    if (!initialData) return undefined;
    const row = initialData as unknown as Record<string, unknown>;
    const categoryName = initialData.category?.name;
    const subcategoryName = initialData.subcategory?.name;
    return mapTenderRowToContestForm(row, categoryName, subcategoryName);
  }, [initialData]);

  const existingDocuments = useMemo(
    () => parseExistingTenderDocuments(initialData?.documents),
    [initialData],
  );

  return (
    <TenderContestForm
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      initialForm={initialForm}
      existingDocuments={existingDocuments}
    />
  );
}
