import type { TenderContestDocumentMeta, TenderContestFormData } from '../../types/tender-contest';
import { selectionCriteriaTotalWeight } from '../../types/tender-contest';
import { isDateOnOrBefore } from './contest-schedule-dates';

export interface TenderContestFormFieldErrors {
  title?: string;
  description?: string;
  managedEntityId?: string;
  category?: string;
  subcategory?: string;
  documents?: string;
  submissionDeadline?: string;
  evaluationDeadline?: string;
  completionDate?: string;
  siteVisitNotes?: string;
  depositAmount?: string;
  depositInstructions?: string;
  paymentTermsCustomDays?: string;
  selectionCriteria?: string;
  criteriaItems?: Record<string, string>;
  professionalLicenseTypes?: string;
}

function isCompletionOnOrBeforeSubmission(completion: Date, submission: Date): boolean {
  return isDateOnOrBefore(submission, completion);
}

function isCompletionOnOrBeforeEvaluation(completion: Date, evaluation: Date): boolean {
  return isDateOnOrBefore(evaluation, completion);
}

export function getTenderContestFormFieldErrors(
  form: TenderContestFormData,
  pendingFiles: File[],
  existingDocs: TenderContestDocumentMeta[],
  hasManagedEntities: boolean,
  status: 'draft' | 'active',
): TenderContestFormFieldErrors {
  const errors: TenderContestFormFieldErrors = {};

  if (form.title.length > 75) {
    errors.title = 'Tytuł może mieć maksymalnie 75 znaków';
  }

  if (
    form.evaluationDeadline &&
    form.submissionDeadline &&
    !Number.isNaN(form.submissionDeadline.getTime()) &&
    form.evaluationDeadline.getTime() <= form.submissionDeadline.getTime()
  ) {
    errors.evaluationDeadline =
      'Rozstrzygnięcie konkursu musi być po dacie zakończenia przyjmowania ofert';
  }

  if (
    form.completionDate &&
    form.evaluationDeadline &&
    !Number.isNaN(form.evaluationDeadline.getTime()) &&
    isCompletionOnOrBeforeEvaluation(form.completionDate, form.evaluationDeadline)
  ) {
    errors.completionDate = 'Termin wykonania musi być po dacie rozstrzygnięcia konkursu';
  } else if (
    form.completionDate &&
    form.submissionDeadline &&
    !Number.isNaN(form.submissionDeadline.getTime()) &&
    isCompletionOnOrBeforeSubmission(form.completionDate, form.submissionDeadline)
  ) {
    errors.completionDate = 'Termin wykonania musi być po dacie zakończenia przyjmowania ofert';
  }

  if (
    (form.siteVisitType === 'optional' || form.siteVisitType === 'mandatory') &&
    !form.siteVisitNotes.trim()
  ) {
    errors.siteVisitNotes = 'Podaj osobę do kontaktu i terminy wizji lokalnej';
  }

  if (form.depositRequired) {
    if (form.depositAmount == null || form.depositAmount <= 0) {
      errors.depositAmount = 'Podaj kwotę wadium';
    }
    if (!form.depositInstructions.trim()) {
      errors.depositInstructions = 'Podaj instrukcję wpłaty wadium';
    }
  }

  if (form.paymentTerms.mode === 'custom') {
    const days = form.paymentTerms.customDays;
    if (days == null || days < 1) {
      errors.paymentTermsCustomDays = 'Podaj liczbę dni na płatność faktury';
    }
  }

  if (status === 'draft') {
    return errors;
  }

  if (!form.title.trim()) {
    errors.title = 'Podaj tytuł konkursu';
  }
  if (!form.description.trim()) {
    errors.description = 'Podaj szczegółowy zakres i uwagi';
  }
  if (hasManagedEntities && !form.managedEntityId) {
    errors.managedEntityId = 'Wybierz wspólnotę lub spółdzielnię';
  }
  if (!form.category) {
    errors.category = 'Wybierz kategorię';
  }
  if (!form.subcategory) {
    errors.subcategory = 'Wybierz podkategorię';
  }
  if (pendingFiles.length + existingDocs.length < 1) {
    errors.documents = 'Dodaj co najmniej jeden plik dokumentacji konkursowej';
  }
  if (!form.submissionDeadline || Number.isNaN(form.submissionDeadline.getTime())) {
    errors.submissionDeadline = 'Podaj datę i godzinę zakończenia przyjmowania ofert';
  }
  if (!form.evaluationDeadline || Number.isNaN(form.evaluationDeadline.getTime())) {
    errors.evaluationDeadline = errors.evaluationDeadline ?? 'Podaj datę rozstrzygnięcia konkursu';
  }

  const criteriaItems = form.selectionCriteria.items;
  if (criteriaItems.length === 0) {
    errors.selectionCriteria = 'Dodaj co najmniej jedno kryterium wyboru';
  } else {
    const itemErrors: Record<string, string> = {};
    for (const item of criteriaItems) {
      if (!item.name.trim()) {
        itemErrors[item.id] = 'Podaj nazwę kryterium';
      }
    }
    if (Object.keys(itemErrors).length > 0) {
      errors.criteriaItems = itemErrors;
    }
    const criteriaSum = selectionCriteriaTotalWeight(criteriaItems);
    if (criteriaSum !== 100) {
      errors.selectionCriteria = 'Suma wag kryteriów wyboru musi wynosić 100%';
    }
  }

  if (form.formalRequirements.professionalLicenses) {
    const types = form.formalRequirements.professionalLicenseTypes ?? [];
    if (types.length === 0) {
      errors.professionalLicenseTypes = 'Zaznacz wymagane typy uprawnień zawodowych';
    }
  }

  return errors;
}

export function hasTenderContestFormFieldErrors(
  errors: TenderContestFormFieldErrors,
): boolean {
  if (
    errors.title ||
    errors.description ||
    errors.managedEntityId ||
    errors.category ||
    errors.subcategory ||
    errors.documents ||
    errors.submissionDeadline ||
    errors.evaluationDeadline ||
    errors.completionDate ||
    errors.siteVisitNotes ||
    errors.depositAmount ||
    errors.depositInstructions ||
    errors.paymentTermsCustomDays ||
    errors.selectionCriteria ||
    errors.professionalLicenseTypes
  ) {
    return true;
  }
  return Boolean(errors.criteriaItems && Object.keys(errors.criteriaItems).length > 0);
}

export function clearTenderContestFieldErrorsForPatch(
  errors: TenderContestFormFieldErrors,
  patch: Partial<TenderContestFormData>,
): TenderContestFormFieldErrors {
  const next: TenderContestFormFieldErrors = { ...errors };

  if ('title' in patch) delete next.title;
  if ('description' in patch) delete next.description;
  if ('managedEntityId' in patch) delete next.managedEntityId;
  if ('category' in patch) delete next.category;
  if ('subcategory' in patch) delete next.subcategory;
  if ('submissionDeadline' in patch) {
    delete next.submissionDeadline;
    delete next.evaluationDeadline;
    delete next.completionDate;
  }
  if ('evaluationDeadline' in patch) delete next.evaluationDeadline;
  if ('completionDate' in patch) delete next.completionDate;
  if ('siteVisitNotes' in patch || 'siteVisitType' in patch) delete next.siteVisitNotes;
  if ('depositAmount' in patch) delete next.depositAmount;
  if ('depositInstructions' in patch || 'depositRequired' in patch) {
    delete next.depositAmount;
    delete next.depositInstructions;
  }
  if ('paymentTerms' in patch) delete next.paymentTermsCustomDays;
  if ('selectionCriteria' in patch) {
    delete next.selectionCriteria;
    delete next.criteriaItems;
  }
  if ('formalRequirements' in patch) {
    delete next.professionalLicenseTypes;
  }

  return next;
}

export function firstTenderContestErrorSelector(
  errors: TenderContestFormFieldErrors,
): string | null {
  if (errors.title) return '#contest-title';
  if (errors.description) return '#contest-desc';
  if (errors.managedEntityId) return '#contest-managed-entity';
  if (errors.category) return '#contest-category';
  if (errors.subcategory) return '#contest-subcategory';
  if (errors.documents) return '#contest-documents';
  if (errors.submissionDeadline) return '#submission-deadline';
  if (errors.evaluationDeadline) return '#evaluation-deadline';
  if (errors.completionDate) return '#completion-date';
  if (errors.siteVisitNotes) return '#site-visit-notes';
  if (errors.professionalLicenseTypes) return '#contest-professional-license-types';
  if (errors.criteriaItems) {
    const firstId = Object.keys(errors.criteriaItems)[0];
    if (firstId) return `[data-criterion-id="${firstId}"]`;
  }
  if (errors.selectionCriteria) return '#contest-selection-criteria';
  if (errors.depositAmount) return '#contest-deposit-amount';
  if (errors.depositInstructions) return '#contest-deposit-instructions';
  if (errors.paymentTermsCustomDays) return '#contest-payment-days';
  return null;
}

export function scrollToFirstTenderContestError(
  errors: TenderContestFormFieldErrors,
): void {
  const selector = firstTenderContestErrorSelector(errors);
  if (!selector) return;

  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) return;

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const focusable =
    element.matches('input, textarea, select, button')
      ? element
      : element.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');

  focusable?.focus({ preventScroll: true });
}
