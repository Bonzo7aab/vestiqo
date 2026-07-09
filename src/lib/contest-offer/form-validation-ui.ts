import type {
  ContestOfferFieldErrors,
  ContestOfferWizardStep,
} from '../database/contest-offers';
import type { ContestOfferFormData, FormalRequirementKey } from '../../types/contest-offer';

export function getContestOfferStepsWithErrors(
  errors: ContestOfferFieldErrors,
): ContestOfferWizardStep[] {
  const steps: ContestOfferWizardStep[] = [];

  if (errors.offerDocumentation) {
    steps.push(1);
  }
  if (errors.proposedCompletionDate || errors.siteVisitConfirmed) {
    steps.push(2);
  }
  if (errors.referencesText || (errors.formal && Object.keys(errors.formal).length > 0)) {
    steps.push(3);
  }
  if (
    errors.netPrice ||
    errors.warrantyMonths ||
    errors.guaranteeMonths ||
    errors.paymentTermsAccepted ||
    errors.deposit
  ) {
    steps.push(4);
  }

  return steps;
}

export function clearContestOfferFieldErrorsForPatch(
  errors: ContestOfferFieldErrors,
  patch: Partial<ContestOfferFormData>,
): ContestOfferFieldErrors {
  const next: ContestOfferFieldErrors = { ...errors };

  if ('proposedCompletionDate' in patch) {
    delete next.proposedCompletionDate;
  }
  if ('siteVisitConfirmed' in patch) {
    delete next.siteVisitConfirmed;
  }
  if ('referencesText' in patch) {
    delete next.referencesText;
  }
  if ('netPrice' in patch) {
    delete next.netPrice;
  }
  if ('warrantyMonths' in patch) {
    delete next.warrantyMonths;
  }
  if ('guaranteeMonths' in patch) {
    delete next.guaranteeMonths;
  }
  if ('paymentTermsAccepted' in patch) {
    delete next.paymentTermsAccepted;
  }

  return next;
}

export function clearContestOfferFormalFieldError(
  errors: ContestOfferFieldErrors,
  key: FormalRequirementKey,
): ContestOfferFieldErrors {
  if (!errors.formal?.[key]) {
    return errors;
  }
  const formal = { ...errors.formal };
  delete formal[key];
  const next: ContestOfferFieldErrors = { ...errors };
  if (Object.keys(formal).length > 0) {
    next.formal = formal;
  } else {
    delete next.formal;
  }
  return next;
}

export function firstContestOfferErrorSelector(
  step: ContestOfferWizardStep,
  errors: ContestOfferFieldErrors,
): string | null {
  if (step === 1) {
    if (errors.offerDocumentation) return '#contest-offer-offerDocumentation';
  }

  if (step === 2) {
    if (errors.proposedCompletionDate) return '#contest-offer-proposedCompletionDate';
    if (errors.siteVisitConfirmed) return '#contest-offer-siteVisitConfirmed';
  }

  if (step === 3) {
    if (errors.referencesText) return '#contest-offer-referencesText';
    if (errors.formal) {
      const firstKey = Object.keys(errors.formal)[0];
      if (firstKey) return `[data-contest-offer-formal="${firstKey}"]`;
    }
  }

  if (step === 4) {
    if (errors.netPrice) return '#contest-offer-netPrice';
    if (errors.warrantyMonths) return '#contest-offer-warrantyMonths';
    if (errors.guaranteeMonths) return '#contest-offer-guaranteeMonths';
    if (errors.deposit) return '#contest-offer-deposit';
    if (errors.paymentTermsAccepted) return '#contest-offer-paymentTermsAccepted';
  }

  return null;
}

export function scrollToFirstContestOfferError(
  step: ContestOfferWizardStep,
  errors: ContestOfferFieldErrors,
): void {
  const selector = firstContestOfferErrorSelector(step, errors);
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
