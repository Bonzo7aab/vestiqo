import type { ContestInfo } from '../../types/job';
import type { ContestOfferFormData, FormalRequirementKey } from '../../types/contest-offer';
import { requiredFormalKeys } from '../../types/contest-offer';
import {
  requiredQualificationTypeIds,
  requiresCertificatesAndLicenses,
} from '../contractor/professional-qualification-documents';
import { professionalQualificationLabel } from '../contractor/constants';
import {
  overlayOfferOcOnSnapshot,
  validateProfileFormalRequirements,
  type ContractorFormalProfileSnapshot,
} from './validate-profile-formal-requirements';
import { warrantyMonthsOptions } from './warranty-period-options';

export type ContestOfferWizardStep = 1 | 2 | 3 | 4;

export interface ContestOfferFieldErrors {
  offerDocumentation?: string;
  proposedCompletionDate?: string;
  siteVisitConfirmed?: string;
  netPrice?: string;
  warrantyMonths?: string;
  guaranteeMonths?: string;
  paymentTermsAccepted?: string;
  deposit?: string;
  formal?: Partial<Record<FormalRequirementKey, string>>;
  qualificationFiles?: Record<string, string>;
}

export const FORMAL_REQUIREMENT_LABELS: Record<FormalRequirementKey, string> = {
  insuranceOc: 'Polisa OC',
  zusUsCertificates: 'Zaświadczenia ZUS/US',
  references: 'Referencje – wykaz zrealizowanych prac',
  professionalCertificates: 'Certyfikaty i uprawnienia',
  professionalLicenses: 'Certyfikaty i uprawnienia',
};

export function localIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isAllowedWarrantyMonths(
  value: string,
  minPeriod: string | null | undefined,
): boolean {
  if (!value) return false;
  const months = Number.parseInt(value, 10);
  if (!Number.isFinite(months)) return false;
  return warrantyMonthsOptions(minPeriod).includes(months);
}

export function hasContestOfferFieldErrors(errors: ContestOfferFieldErrors): boolean {
  if (
    errors.offerDocumentation ||
    errors.proposedCompletionDate ||
    errors.siteVisitConfirmed ||
    errors.netPrice ||
    errors.warrantyMonths ||
    errors.guaranteeMonths ||
    errors.paymentTermsAccepted ||
    errors.deposit
  ) {
    return true;
  }
  return Boolean(
    (errors.formal && Object.keys(errors.formal).length > 0) ||
      (errors.qualificationFiles && Object.keys(errors.qualificationFiles).length > 0),
  );
}

function hasOfferDocumentation(form: ContestOfferFormData): boolean {
  const offerDocs = form.extraAttachments.filter((a) => a.requirementKey === 'offerDocumentation');
  const staged = form.stagedFiles.offerDocumentation?.length ?? 0;
  return offerDocs.length > 0 || staged > 0;
}

function hasQualificationTypeFile(form: ContestOfferFormData, typeId: string): boolean {
  return Boolean(
    form.qualificationAttachments.some((item) => item.qualificationTypeId === typeId) ||
      form.stagedQualificationFiles[typeId],
  );
}

function hasFormalRequirementFile(
  form: ContestOfferFormData,
  key: FormalRequirementKey,
): boolean {
  if (key === 'professionalLicenses' || key === 'professionalCertificates') {
    if (Object.keys(form.stagedQualificationFiles).length > 0) return true;
    if (form.qualificationAttachments.length > 0) return true;
  }
  return Boolean(form.formalAttachments[key] || form.stagedFiles[key]?.length);
}

export function getContestOfferStepFieldErrors(
  step: ContestOfferWizardStep,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
  profileSnapshot?: ContractorFormalProfileSnapshot | null,
): ContestOfferFieldErrors {
  const errors: ContestOfferFieldErrors = {};

  if (step === 1) {
    if (!hasOfferDocumentation(form)) {
      errors.offerDocumentation = 'Dodaj co najmniej jeden plik dokumentacji ofertowej';
    }
    return errors;
  }

  if (step === 2) {
    if (!form.proposedCompletionDate) {
      errors.proposedCompletionDate = 'Podaj oferowany termin wykonania';
    } else if (form.proposedCompletionDate < localIsoDate()) {
      errors.proposedCompletionDate = 'Termin wykonania nie może być w przeszłości';
    }
    if (contestInfo.siteVisitType === 'mandatory' && !form.siteVisitConfirmed) {
      errors.siteVisitConfirmed = 'Potwierdź odbycie wizji lokalnej';
    }
    return errors;
  }

  if (step === 3) {
    const formal: Partial<Record<FormalRequirementKey, string>> = {};
    const qualificationFiles: Record<string, string> = {};
    const required = requiredFormalKeys(contestInfo.formalRequirements);
    const typeIds = requiredQualificationTypeIds(contestInfo.formalRequirements);

    for (const key of required) {
      if (key === 'professionalLicenses' || key === 'professionalCertificates') {
        continue;
      }
      const attached = form.formalAttachments[key];
      const staged = form.stagedFiles[key]?.length;
      if (!attached && !staged) {
        formal[key] = `Wgraj lub wybierz z profilu: ${FORMAL_REQUIREMENT_LABELS[key]}`;
      }
    }

    if (typeIds.length > 0) {
      for (const typeId of typeIds) {
        if (!hasQualificationTypeFile(form, typeId)) {
          qualificationFiles[typeId] =
            `Wgraj lub wybierz z profilu: ${professionalQualificationLabel(typeId)}`;
        }
      }
    } else if (requiresCertificatesAndLicenses(contestInfo.formalRequirements)) {
      if (!hasFormalRequirementFile(form, 'professionalLicenses')) {
        formal.professionalLicenses = `Wgraj lub wybierz z profilu: ${FORMAL_REQUIREMENT_LABELS.professionalLicenses}`;
      }
    }

    if (Object.keys(formal).length > 0) {
      errors.formal = formal;
    }
    if (Object.keys(qualificationFiles).length > 0) {
      errors.qualificationFiles = qualificationFiles;
    }
    if (profileSnapshot) {
      const offerCoversLicenses =
        typeIds.length > 0
          ? typeIds.every((typeId) => hasQualificationTypeFile(form, typeId))
          : hasFormalRequirementFile(form, 'professionalLicenses');
      const snapshotForProfile =
        offerCoversLicenses && !profileSnapshot.professionalQualificationsScanPath
          ? {
              ...overlayOfferOcOnSnapshot(profileSnapshot, form),
              professionalQualificationsScanPath: 'offer-local',
            }
          : overlayOfferOcOnSnapshot(profileSnapshot, form);
      const profileErrors = validateProfileFormalRequirements(
        contestInfo.formalRequirements,
        snapshotForProfile,
      );
      if (Object.keys(profileErrors).length > 0) {
        errors.formal = { ...formal, ...profileErrors };
      }
    }
    return errors;
  }

  if (step === 4) {
    const net = Number.parseFloat(form.netPrice);
    if (!form.netPrice.trim() || Number.isNaN(net) || net <= 0) {
      errors.netPrice = 'Podaj cenę netto';
    }
    if (!isAllowedWarrantyMonths(form.warrantyMonths, contestInfo.warrantyPeriod)) {
      errors.warrantyMonths = 'Wybierz okres gwarancji';
    }
    if (!isAllowedWarrantyMonths(form.guaranteeMonths, contestInfo.guaranteePeriod)) {
      errors.guaranteeMonths = 'Wybierz okres rękojmi';
    }
    if (
      contestInfo.paymentTerms.mode === 'custom' &&
      (contestInfo.paymentTerms.customDays ?? 0) > 14 &&
      !form.paymentTermsAccepted
    ) {
      errors.paymentTermsAccepted = 'Zaakceptuj wymagany termin płatności';
    }
    if (contestInfo.depositRequired) {
      const depositFile = form.extraAttachments.find((a) => a.requirementKey === 'deposit');
      const stagedDeposit = form.stagedFiles.deposit?.length;
      if (!depositFile && !stagedDeposit) {
        errors.deposit = 'Wgraj potwierdzenie przelewu wadium';
      }
    }
    return errors;
  }

  return errors;
}

export function getContestOfferAllFieldErrors(
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
  profileSnapshot?: ContractorFormalProfileSnapshot | null,
): ContestOfferFieldErrors {
  const step1 = getContestOfferStepFieldErrors(1, form, contestInfo, profileSnapshot);
  const step2 = getContestOfferStepFieldErrors(2, form, contestInfo, profileSnapshot);
  const step3 = getContestOfferStepFieldErrors(3, form, contestInfo, profileSnapshot);
  const step4 = getContestOfferStepFieldErrors(4, form, contestInfo, profileSnapshot);

  const formal = { ...step3.formal };
  const qualificationFiles = { ...step3.qualificationFiles };

  return {
    offerDocumentation: step1.offerDocumentation,
    proposedCompletionDate: step2.proposedCompletionDate,
    siteVisitConfirmed: step2.siteVisitConfirmed,
    netPrice: step4.netPrice,
    warrantyMonths: step4.warrantyMonths,
    guaranteeMonths: step4.guaranteeMonths,
    paymentTermsAccepted: step4.paymentTermsAccepted,
    deposit: step4.deposit,
    ...(Object.keys(formal).length > 0 ? { formal } : {}),
    ...(Object.keys(qualificationFiles).length > 0 ? { qualificationFiles } : {}),
  };
}

export function filterFieldErrorsForStep(
  step: ContestOfferWizardStep,
  errors: ContestOfferFieldErrors,
): ContestOfferFieldErrors {
  switch (step) {
    case 1:
      return { offerDocumentation: errors.offerDocumentation };
    case 2:
      return {
        proposedCompletionDate: errors.proposedCompletionDate,
        siteVisitConfirmed: errors.siteVisitConfirmed,
      };
    case 3:
      return {
        formal: errors.formal,
        qualificationFiles: errors.qualificationFiles,
      };
    case 4:
      return {
        netPrice: errors.netPrice,
        warrantyMonths: errors.warrantyMonths,
        guaranteeMonths: errors.guaranteeMonths,
        paymentTermsAccepted: errors.paymentTermsAccepted,
        deposit: errors.deposit,
      };
    default:
      return {};
  }
}

export function firstContestOfferStepWithErrors(
  errors: ContestOfferFieldErrors,
): ContestOfferWizardStep | null {
  if (errors.offerDocumentation) return 1;
  if (errors.proposedCompletionDate || errors.siteVisitConfirmed) return 2;
  if (errors.formal && Object.keys(errors.formal).length > 0) {
    return 3;
  }
  if (errors.qualificationFiles && Object.keys(errors.qualificationFiles).length > 0) {
    return 3;
  }
  if (
    errors.netPrice ||
    errors.warrantyMonths ||
    errors.guaranteeMonths ||
    errors.paymentTermsAccepted ||
    errors.deposit
  ) {
    return 4;
  }
  return null;
}

function firstFieldErrorMessage(errors: ContestOfferFieldErrors): string | null {
  if (errors.offerDocumentation) return errors.offerDocumentation;
  if (errors.proposedCompletionDate) return errors.proposedCompletionDate;
  if (errors.siteVisitConfirmed) return errors.siteVisitConfirmed;
  if (errors.formal) {
    const first = Object.values(errors.formal)[0];
    if (first) return first;
  }
  if (errors.qualificationFiles) {
    const firstQual = Object.values(errors.qualificationFiles)[0];
    if (firstQual) return firstQual;
  }
  if (errors.netPrice) return errors.netPrice;
  if (errors.warrantyMonths) return errors.warrantyMonths;
  if (errors.guaranteeMonths) return errors.guaranteeMonths;
  if (errors.paymentTermsAccepted) return errors.paymentTermsAccepted;
  if (errors.deposit) return errors.deposit;
  return null;
}

export function isFormalRequirementComplete(
  form: ContestOfferFormData,
  key: FormalRequirementKey,
): boolean {
  return hasFormalRequirementFile(form, key);
}

export function countFormalRequirementsProgress(
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
): { completed: number; total: number } {
  const keys = requiredFormalKeys(contestInfo.formalRequirements).filter(
    (key) => key !== 'professionalLicenses' && key !== 'professionalCertificates',
  );
  const typeIds = requiredQualificationTypeIds(contestInfo.formalRequirements);
  const otherCompleted = keys.filter((key) => isFormalRequirementComplete(form, key)).length;
  if (typeIds.length > 0) {
    const typeCompleted = typeIds.filter((typeId) => hasQualificationTypeFile(form, typeId)).length;
    return { completed: otherCompleted + typeCompleted, total: keys.length + typeIds.length };
  }
  if (requiresCertificatesAndLicenses(contestInfo.formalRequirements)) {
    return {
      completed: otherCompleted + (isFormalRequirementComplete(form, 'professionalLicenses') ? 1 : 0),
      total: keys.length + 1,
    };
  }
  return { completed: otherCompleted, total: keys.length };
}

export function validateContestOfferStep(
  step: ContestOfferWizardStep,
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
  profileSnapshot?: ContractorFormalProfileSnapshot | null,
): string | null {
  const errors = getContestOfferStepFieldErrors(step, form, contestInfo, profileSnapshot);
  return firstFieldErrorMessage(errors);
}

export function validateContestOfferSubmit(
  form: ContestOfferFormData,
  contestInfo: ContestInfo,
  profileSnapshot?: ContractorFormalProfileSnapshot | null,
): string | null {
  const errors = getContestOfferAllFieldErrors(form, contestInfo, profileSnapshot);
  return firstFieldErrorMessage(errors);
}
