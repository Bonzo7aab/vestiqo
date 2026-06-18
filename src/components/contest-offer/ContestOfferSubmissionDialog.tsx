'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { notifyContestBidStatusChanged } from '../../utils/contestBidStatusEvents';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import type { ContestInfo } from '../../types/job';
import type {
  ContestOfferFormData,
  FormalRequirementKey,
  ResolvedContractorDocument,
} from '../../types/contest-offer';
import {
  computeGrossFromNet,
  createEmptyContestOfferForm,
} from '../../types/contest-offer';
import { createClient } from '../../lib/supabase/client';
import {
  completionDateWarning,
  contestCountdownLabel,
  fetchTenderBidDraft,
  hydrateContestOfferFormFromBid,
  firstContestOfferStepWithErrors,
  filterFieldErrorsForStep,
  getContestOfferAllFieldErrors,
  getContestOfferStepFieldErrors,
  hasContestOfferFieldErrors,
  type ContestOfferFieldErrors,
  type ContestOfferWizardStep,
} from '../../lib/database/contest-offers';
import { submitTenderBid, upsertTenderBidDraft, abandonTenderBidDraftAction } from '../../lib/database/contest-offers-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  applyProfileDocumentsToForm,
  buildFormalAttachmentFromProfile,
} from '../../lib/contest-offer/build-profile-formal-attachment';
import {
  clearContestOfferFieldErrorsForPatch,
  clearContestOfferFormalFieldError,
  getContestOfferStepsWithErrors,
  scrollToFirstContestOfferError,
} from '../../lib/contest-offer/form-validation-ui';
import {
  loadContractorReferencesPrefill,
} from '../../lib/contest-offer/resolve-contractor-documents';
import { resolveContractorDocuments } from '../../lib/contest-offer/resolve-contractor-documents-actions';
import { ContestOfferWizardStepper } from './ContestOfferWizardStepper';
import { ContestOfferContextPanel } from './ContestOfferContextPanel';
import { ContestOfferStepBasic } from './ContestOfferStepBasic';
import { ContestOfferStepSchedule } from './ContestOfferStepSchedule';
import { ContestOfferStepFormal } from './ContestOfferStepFormal';
import { ContestOfferStepFinancial } from './ContestOfferStepFinancial';

const STEP_LABELS = [
  'Informacje podstawowe',
  'Harmonogram',
  'Wymogi',
  'Warunki',
];

export interface ContestOfferSubmissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenderId: string;
  jobTitle: string;
  description: string;
  category?: string;
  subcategory?: string;
  contestInfo: ContestInfo;
  contractorId: string;
  onSubmitted?: () => void;
  onDraftSaved?: () => void;
  onDraftAbandoned?: () => void;
}

export function ContestOfferSubmissionDialog({
  isOpen,
  onClose,
  tenderId,
  jobTitle,
  description,
  category,
  subcategory,
  contestInfo,
  contractorId,
  onSubmitted,
  onDraftSaved,
  onDraftAbandoned,
}: ContestOfferSubmissionDialogProps): React.ReactElement {
  const supabase = useMemo(() => createClient(), []);
  const [currentStep, setCurrentStep] = useState<ContestOfferWizardStep>(1);
  const [form, setForm] = useState<ContestOfferFormData>(createEmptyContestOfferForm);
  const [resolvedDocs, setResolvedDocs] = useState<ResolvedContractorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [showAbandonDialog, setShowAbandonDialog] = useState(false);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ContestOfferFieldErrors>({});
  const [validatedSteps, setValidatedSteps] = useState<Set<ContestOfferWizardStep>>(
    () => new Set(),
  );
  const profileDocsAppliedRef = useRef(false);
  const shouldFocusFieldErrorRef = useRef(false);

  const totalSteps = 4;

  const grossDisplay = useMemo(() => {
    const net = Number.parseFloat(form.netPrice);
    if (!form.netPrice.trim() || Number.isNaN(net) || net <= 0) return '—';
    return computeGrossFromNet(net, form.vatRate).toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [form.netPrice, form.vatRate]);

  const completionWarning = completionDateWarning(
    form.proposedCompletionDate,
    contestInfo.completionDate,
  );

  const loadInitial = useCallback(async () => {
    if (!isOpen || !contractorId) return;
    setIsLoading(true);
    try {
      const [{ data: draft }, docs, referencesPrefill] = await Promise.all([
        fetchTenderBidDraft(supabase, tenderId, contractorId),
        resolveContractorDocuments(contractorId, contestInfo.formalRequirements),
        loadContractorReferencesPrefill(supabase, contractorId),
      ]);
      setResolvedDocs(docs);

      if (draft) {
        setHasExistingDraft(true);
        const hydrated = hydrateContestOfferFormFromBid(draft);
        if (draft.offer_details && typeof draft.offer_details === 'object') {
          const step = (draft.offer_details as { currentStep?: number }).currentStep;
          if (step && step >= 1 && step <= 4) {
            setCurrentStep(step as ContestOfferWizardStep);
          }
        }
        hydrated.formalAttachments = applyProfileDocumentsToForm(
          docs,
          hydrated.formalAttachments,
        ) as ContestOfferFormData['formalAttachments'];
        setForm(hydrated);
      } else {
        setHasExistingDraft(false);
        const empty = createEmptyContestOfferForm();
        if (referencesPrefill) empty.referencesText = referencesPrefill;
        if (contestInfo.paymentTerms.mode === 'standard_14') {
          empty.paymentTermsAccepted = true;
        }
        empty.formalAttachments = applyProfileDocumentsToForm(
          docs,
          empty.formalAttachments,
        ) as ContestOfferFormData['formalAttachments'];
        setForm(empty);
        setCurrentStep(1);
        profileDocsAppliedRef.current = true;
      }
      setFieldErrors({});
      setValidatedSteps(new Set());
    } catch (e) {
      console.error(e);
      toast.error('Nie udało się załadować szkicu oferty');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, contractorId, supabase, tenderId, contestInfo]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!isOpen) {
      profileDocsAppliedRef.current = false;
      setFieldErrors({});
      setValidatedSteps(new Set());
      setHasExistingDraft(false);
      setShowAbandonDialog(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentStep !== 3 || isLoading || profileDocsAppliedRef.current) return;
    profileDocsAppliedRef.current = true;
    setForm((prev) => ({
      ...prev,
      formalAttachments: applyProfileDocumentsToForm(
        resolvedDocs,
        prev.formalAttachments,
      ) as ContestOfferFormData['formalAttachments'],
    }));
  }, [currentStep, isLoading, resolvedDocs]);

  const displayedFieldErrors = useMemo(() => {
    if (!validatedSteps.has(currentStep)) {
      return {};
    }
    return filterFieldErrorsForStep(currentStep, fieldErrors);
  }, [currentStep, fieldErrors, validatedSteps]);

  const applyValidationErrors = useCallback(
    (errors: ContestOfferFieldErrors, stepsToValidate: ContestOfferWizardStep[]): void => {
      shouldFocusFieldErrorRef.current = true;
      setFieldErrors(errors);
      setValidatedSteps((prev) => new Set([...prev, ...stepsToValidate]));
      const targetStep = firstContestOfferStepWithErrors(errors);
      if (targetStep) {
        setCurrentStep(targetStep);
      }
    },
    [],
  );

  useEffect(() => {
    if (!shouldFocusFieldErrorRef.current || !hasContestOfferFieldErrors(fieldErrors)) {
      return;
    }
    shouldFocusFieldErrorRef.current = false;
    const targetStep = firstContestOfferStepWithErrors(fieldErrors) ?? currentStep;
    const frame = window.requestAnimationFrame(() => {
      scrollToFirstContestOfferError(targetStep, fieldErrors);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fieldErrors, currentStep]);

  const patchForm = (patch: Partial<ContestOfferFormData>): void => {
    setFieldErrors((prev) => clearContestOfferFieldErrorsForPatch(prev, patch));
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveDraft = async (): Promise<void> => {
    setIsSavingDraft(true);
    try {
      const { error } = await upsertTenderBidDraft(
        tenderId,
        contractorId,
        form,
        currentStep,
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Szkic oferty został zapisany');
      setHasExistingDraft(true);
      notifyContestBidStatusChanged({ tenderId, status: 'draft' });
      onDraftSaved?.();
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleAbandonDraft = async (): Promise<void> => {
    setIsAbandoning(true);
    try {
      const result = await abandonTenderBidDraftAction({
        contractorId,
        tenderId,
      });
      if (!result.success) {
        toast.error(result.error ?? 'Nie udało się odrzucić szkicu oferty');
        return;
      }
      toast.success('Szkic oferty został odrzucony');
      setShowAbandonDialog(false);
      notifyContestBidStatusChanged({ tenderId, status: 'none' });
      onDraftAbandoned?.();
      onClose();
    } finally {
      setIsAbandoning(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const allErrors = getContestOfferAllFieldErrors(form, contestInfo);
    if (hasContestOfferFieldErrors(allErrors)) {
      applyValidationErrors(allErrors, getContestOfferStepsWithErrors(allErrors));
      return;
    }
    setFieldErrors({});
    setValidatedSteps(new Set());
    setIsSubmitting(true);
    try {
      const { error } = await submitTenderBid(
        tenderId,
        contractorId,
        form,
        contestInfo,
      );
      if (error) {
        const inlineErrors = getContestOfferAllFieldErrors(form, contestInfo);
        if (hasContestOfferFieldErrors(inlineErrors)) {
          applyValidationErrors(inlineErrors, getContestOfferStepsWithErrors(inlineErrors));
          return;
        }
        toast.error(error.message);
        return;
      }
      toast.success('Oferta wysłana', {
        classNames: {
          toast: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          title: 'text-emerald-800',
        },
      });
      notifyContestBidStatusChanged({ tenderId, status: 'submitted' });
      onSubmitted?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = (): void => {
    const errors = getContestOfferStepFieldErrors(currentStep, form, contestInfo);
    if (hasContestOfferFieldErrors(errors)) {
      applyValidationErrors(errors, [currentStep]);
      return;
    }
    setFieldErrors({});
    setValidatedSteps(new Set());
    setCurrentStep((s) => Math.min(totalSteps, s + 1) as ContestOfferWizardStep);
  };

  const handlePrevStep = (): void => {
    setValidatedSteps((prev) => {
      const next = new Set(prev);
      next.delete(currentStep);
      return next;
    });
    setCurrentStep((s) => Math.max(1, s - 1) as ContestOfferWizardStep);
  };

  const stageFile = (key: keyof ContestOfferFormData['stagedFiles'], file: File): void => {
    setFieldErrors((prev) => {
      if (key === 'deposit') {
        const next = { ...prev };
        delete next.deposit;
        return next;
      }
      if (key !== 'other') {
        return clearContestOfferFormalFieldError(prev, key);
      }
      return prev;
    });
    setForm((prev) => ({
      ...prev,
      stagedFiles: { ...prev.stagedFiles, [key]: [file] },
    }));
  };

  const removeFormalDocument = (key: FormalRequirementKey): void => {
    setForm((prev) => {
      const { [key]: _attachment, ...formalAttachments } = prev.formalAttachments;
      const { [key]: _staged, ...stagedFiles } = prev.stagedFiles;
      return { ...prev, formalAttachments, stagedFiles };
    });
    setFieldErrors((prev) => clearContestOfferFormalFieldError(prev, key));
  };

  const replaceFormalDocument = (key: FormalRequirementKey, file: File): void => {
    setForm((prev) => {
      const { [key]: _attachment, ...formalAttachments } = prev.formalAttachments;
      return {
        ...prev,
        formalAttachments,
        stagedFiles: { ...prev.stagedFiles, [key]: [file] },
      };
    });
    setFieldErrors((prev) => clearContestOfferFormalFieldError(prev, key));
  };

  const applyProfileDocument = (doc: ResolvedContractorDocument): void => {
    const attachment = buildFormalAttachmentFromProfile(doc);
    if (!attachment) return;
    setForm((prev) => {
      const { [doc.requirementKey]: _staged, ...stagedFiles } = prev.stagedFiles;
      return {
        ...prev,
        formalAttachments: {
          ...prev.formalAttachments,
          [doc.requirementKey]: attachment,
        },
        stagedFiles,
      };
    });
    setFieldErrors((prev) => clearContestOfferFormalFieldError(prev, doc.requirementKey));
  };

  const removeExtraAttachment = (id: string): void => {
    setForm((prev) => ({
      ...prev,
      extraAttachments: prev.extraAttachments.filter((a) => a.id !== id),
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] min-h-0 flex-col gap-0 overflow-hidden p-0 lg:max-w-4xl">
        <DialogHeader className="shrink-0 space-y-3 border-b bg-muted/30 px-6 py-4 pr-12">
          <div className="space-y-1">
            <DialogTitle className="text-left text-lg leading-snug">
              Składasz ofertę w konkursie
            </DialogTitle>
            <DialogDescription className="text-left text-sm">
              <span className="font-medium text-foreground">{jobTitle}</span>
            </DialogDescription>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <span>
              Czas na złożenie oferty:{' '}
              <span className="font-medium text-foreground">
                {contestCountdownLabel(contestInfo.submissionDeadline)}
              </span>
            </span>
          </p>
          <ContestOfferWizardStepper
            currentStep={currentStep}
            totalSteps={totalSteps}
            labels={STEP_LABELS}
          />
          {!isLoading ? (
            <ContestOfferContextPanel
              currentStep={currentStep}
              description={description}
              category={category}
              subcategory={subcategory}
              contestInfo={contestInfo}
            />
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <ContestOfferStepBasic
                  form={form}
                  onStageFile={(file) => stageFile('other', file)}
                  onRemoveExtra={removeExtraAttachment}
                />
              )}
              {currentStep === 2 && (
                <ContestOfferStepSchedule
                  form={form}
                  contestInfo={contestInfo}
                  completionWarning={completionWarning}
                  fieldErrors={displayedFieldErrors}
                  onPatch={patchForm}
                />
              )}
              {currentStep === 3 && (
                <ContestOfferStepFormal
                  form={form}
                  contestInfo={contestInfo}
                  resolvedDocs={resolvedDocs}
                  fieldErrors={displayedFieldErrors}
                  onPatch={patchForm}
                  onUseProfile={applyProfileDocument}
                  onUploadFormal={replaceFormalDocument}
                  onRemoveFormal={removeFormalDocument}
                  onStageOther={(file) => stageFile('other', file)}
                  onRemoveExtra={removeExtraAttachment}
                />
              )}
              {currentStep === 4 && (
                <ContestOfferStepFinancial
                  form={form}
                  contestInfo={contestInfo}
                  grossDisplay={grossDisplay}
                  fieldErrors={displayedFieldErrors}
                  onPatch={patchForm}
                  onStageDeposit={(file) => stageFile('deposit', file)}
                />
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep <= 1 || isLoading}
              onClick={handlePrevStep}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Wstecz
            </Button>
            {currentStep < totalSteps && (
              <Button
                type="button"
                variant="secondary"
                disabled={isLoading}
                onClick={handleNextStep}
              >
                Dalej
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
            {hasExistingDraft ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isAbandoning || isLoading}
                onClick={() => setShowAbandonDialog(true)}
              >
                Odrzuć szkic
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={isSavingDraft || isLoading}
              onClick={() => void handleSaveDraft()}
            >
              {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Zapisz jako szkic
            </Button>
            {currentStep === totalSteps && (
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90"
                disabled={isSubmitting || isLoading}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Wyślij ofertę do sejfu
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showAbandonDialog} onOpenChange={setShowAbandonDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odrzucić szkic oferty?</AlertDialogTitle>
          <AlertDialogDescription>
            Szkic zostanie trwale usunięty. Tej operacji nie można cofnąć — będziesz mógł
            rozpocząć składanie oferty od nowa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isAbandoning}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            disabled={isAbandoning}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void handleAbandonDraft();
            }}
          >
            {isAbandoning ? 'Usuwanie…' : 'Odrzuć szkic'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
