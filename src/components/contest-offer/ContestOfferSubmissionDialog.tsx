'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import posthog from 'posthog-js';
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
import { Badge } from '../ui/badge';
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
  fetchTenderBidOfferState,
  hydrateContestOfferFormFromBid,
  migrateLegacyOfferAttachments,
  firstContestOfferStepWithErrors,
  filterFieldErrorsForStep,
  getContestOfferAllFieldErrors,
  getContestOfferStepFieldErrors,
  hasContestOfferFieldErrors,
  toSerializableContestOfferForm,
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
import { uploadContestOfferStagedFiles } from '../../lib/contest-offer/upload-staged-offer-files';
import { contestOfferErrorFromUnknown, CONTEST_OFFER_ERRORS } from '../../lib/contest-offer/error-messages';
import { resolveContractorDocuments } from '../../lib/contest-offer/resolve-contractor-documents-actions';
import { ContestOfferWizardStepper } from './ContestOfferWizardStepper';
import { ContestOfferContextPanel } from './ContestOfferContextPanel';
import { ContestOfferStepBasic } from './ContestOfferStepBasic';
import { ContestOfferStepSchedule } from './ContestOfferStepSchedule';
import { ContestOfferStepFormal } from './ContestOfferStepFormal';
import { ContestOfferStepFinancial } from './ContestOfferStepFinancial';
import { CategoryIconTile } from '../contest/CategoryIconTile';
import { FormErrorBanner } from '../ui/form-error-banner';
import {
  getCategoryColor,
  resolveCategorySlugFromJob,
} from '../../lib/config/categoryConfig';

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
  const [formError, setFormError] = useState<string | null>(null);
  const [validatedSteps, setValidatedSteps] = useState<Set<ContestOfferWizardStep>>(
    () => new Set(),
  );
  const profileDocsAppliedRef = useRef(false);
  const shouldFocusFieldErrorRef = useRef(false);

  const totalSteps = 4;

  const categorySlug = useMemo(
    () => resolveCategorySlugFromJob({ category }),
    [category],
  );
  const categoryColor = useMemo(
    () => (categorySlug ? getCategoryColor(categorySlug) : 'hsl(var(--primary))'),
    [categorySlug],
  );

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
      const [{ state: offerState }, docs] = await Promise.all([
        fetchTenderBidOfferState(supabase, tenderId, contractorId),
        resolveContractorDocuments(contractorId, contestInfo.formalRequirements),
      ]);

      if (offerState === 'submitted') {
        toast.error(CONTEST_OFFER_ERRORS.alreadySubmitted);
        onClose();
        return;
      }

      const draft =
        offerState === 'draft'
          ? (await fetchTenderBidDraft(supabase, tenderId, contractorId)).data
          : null;

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
      setFormError(null);
      setFieldErrors({});
      setValidatedSteps(new Set());
    } catch (e) {
      console.error(e);
      setFormError('Nie udało się załadować szkicu oferty');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, contractorId, supabase, tenderId, contestInfo, onClose]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!isOpen) {
      profileDocsAppliedRef.current = false;
      setFormError(null);
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
      setFormError(null);
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
    setFormError(null);
    setFieldErrors((prev) => clearContestOfferFieldErrorsForPatch(prev, patch));
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSaveDraft = async (): Promise<void> => {
    setIsSavingDraft(true);
    setFormError(null);
    try {
      const { form: uploadedForm, error: uploadError } = await uploadContestOfferStagedFiles(
        contractorId,
        tenderId,
        form,
      );
      if (uploadError) {
        setFormError(contestOfferErrorFromUnknown(uploadError));
        return;
      }
      setForm(uploadedForm);

      const { error } = await upsertTenderBidDraft(
        tenderId,
        contractorId,
        toSerializableContestOfferForm(uploadedForm),
        currentStep,
      );
      if (error) {
        setFormError(contestOfferErrorFromUnknown(error));
        return;
      }
      toast.success('Szkic oferty został zapisany');
      posthog.capture('contest_bid_draft_saved', { tender_id: tenderId });
      setHasExistingDraft(true);
      notifyContestBidStatusChanged({ tenderId, status: 'draft' });
      onDraftSaved?.();
    } catch (err) {
      setFormError(contestOfferErrorFromUnknown(err));
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
      posthog.capture('contest_bid_draft_abandoned', { tender_id: tenderId });
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
    setFormError(null);
    setIsSubmitting(true);
    try {
      const { form: uploadedForm, error: uploadError } = await uploadContestOfferStagedFiles(
        contractorId,
        tenderId,
        form,
      );
      if (uploadError) {
        setFormError(contestOfferErrorFromUnknown(uploadError));
        return;
      }
      setForm(uploadedForm);

      const { error } = await submitTenderBid(
        tenderId,
        contractorId,
        toSerializableContestOfferForm(uploadedForm),
        contestInfo,
      );
      if (error) {
        const inlineErrors = getContestOfferAllFieldErrors(uploadedForm, contestInfo);
        if (hasContestOfferFieldErrors(inlineErrors)) {
          applyValidationErrors(inlineErrors, getContestOfferStepsWithErrors(inlineErrors));
          return;
        }
        setFormError(contestOfferErrorFromUnknown(error));
        return;
      }
      posthog.capture('contest_offer_submitted', { tender_id: tenderId });
      toast.success('Oferta wysłana', {
        classNames: {
          toast: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          title: 'text-emerald-800',
        },
      });
      notifyContestBidStatusChanged({ tenderId, status: 'submitted' });
      onSubmitted?.();
      onClose();
    } catch (err) {
      setFormError(contestOfferErrorFromUnknown(err));
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

  const stageOfferDocumentationFiles = (files: File[]): void => {
    if (files.length === 0) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.offerDocumentation;
      return next;
    });
    setForm((prev) => {
      const migrated = migrateLegacyOfferAttachments(prev);
      return {
        ...migrated,
        stagedFiles: {
          ...migrated.stagedFiles,
          offerDocumentation: [...(migrated.stagedFiles.offerDocumentation ?? []), ...files],
        },
      };
    });
  };

  const removeStagedOfferDocumentation = (index: number): void => {
    setForm((prev) => {
      const offerDocumentation = [...(prev.stagedFiles.offerDocumentation ?? [])];
      offerDocumentation.splice(index, 1);
      const stagedFiles = { ...prev.stagedFiles };
      if (offerDocumentation.length > 0) {
        stagedFiles.offerDocumentation = offerDocumentation;
      } else {
        delete stagedFiles.offerDocumentation;
      }
      return { ...prev, stagedFiles };
    });
  };

  const stageFile = (key: keyof ContestOfferFormData['stagedFiles'], file: File): void => {
    setFieldErrors((prev) => {
      if (key === 'deposit') {
        const next = { ...prev };
        delete next.deposit;
        return next;
      }
      if (key !== 'other' && key !== 'offerDocumentation') {
        return clearContestOfferFormalFieldError(prev, key as FormalRequirementKey);
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

  const removeDeposit = (): void => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.deposit;
      return next;
    });
    setForm((prev) => {
      const { deposit: _deposit, ...stagedFiles } = prev.stagedFiles;
      return {
        ...prev,
        extraAttachments: prev.extraAttachments.filter((a) => a.requirementKey !== 'deposit'),
        stagedFiles,
      };
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] min-h-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-lg lg:max-w-4xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-5 pr-12 text-left">
          <div className="flex items-start gap-3">
            <CategoryIconTile
              categorySlug={categorySlug}
              color={categoryColor}
              className="h-11 w-11 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              {(category || subcategory) ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {category ? (
                    <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
                      {category}
                    </Badge>
                  ) : null}
                  {subcategory ? (
                    <Badge variant="outline" className="text-[11px] font-medium text-muted-foreground">
                      {subcategory}
                    </Badge>
                  ) : null}
                </div>
              ) : null}
              <DialogDescription className="mb-1 text-xs font-medium text-muted-foreground">
                Składasz ofertę w konkursie
              </DialogDescription>
              <DialogTitle className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                {jobTitle}
              </DialogTitle>
              <div
                className="mt-2.5 inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-border/50 bg-background px-2.5 py-1 text-[11px] leading-snug text-muted-foreground shadow-sm"
                role="status"
              >
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
                  <span className="font-medium">Czas na złożenie</span>
                </span>
                <span className="hidden h-2.5 w-px shrink-0 bg-border/70 sm:inline" aria-hidden />
                <span className="font-semibold tabular-nums tracking-tight text-foreground">
                  {contestCountdownLabel(contestInfo.submissionDeadline)}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 space-y-4 border-b bg-muted/10 px-6 py-4">
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
        </div>

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
                  fieldErrors={displayedFieldErrors}
                  onStageFiles={stageOfferDocumentationFiles}
                  onRemoveExtra={removeExtraAttachment}
                  onRemoveStaged={removeStagedOfferDocumentation}
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
                    resolvedDocs={resolvedDocs}
                    fieldErrors={displayedFieldErrors}
                    onUseProfile={applyProfileDocument}
                    onUploadFormal={replaceFormalDocument}
                    onRemoveFormal={removeFormalDocument}
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
                  onRemoveDeposit={removeDeposit}
                />
              )}
            </>
          )}
        </div>

        {formError ? (
          <div className="shrink-0 px-6 pt-3">
            <FormErrorBanner
              message={formError}
              className="mb-0"
              testId="contest-offer-form-error"
            />
          </div>
        ) : null}

        <DialogFooter className="shrink-0 flex-col gap-2 border-t bg-muted/20 px-6 py-4 sm:flex-row sm:justify-between">
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
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto sm:justify-end">
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
            {currentStep === totalSteps && (
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90"
                disabled={isSubmitting || isLoading}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Wyślij ofertę
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
