import { upsertContractorAccountSettings } from '../database/contractor-account';
import type { ContestOfferFormData } from '../../types/contest-offer';
import { parseOcGuaranteeAmountInput } from './validate-profile-formal-requirements';

/**
 * Write offer-form OC date/sum (and a newly attached scan path) back to the
 * contractor profile so later contests can autofill (OPD-186).
 */
export async function persistContestOfferOcToProfile(
  userId: string,
  form: ContestOfferFormData,
): Promise<void> {
  const parsedAmount = parseOcGuaranteeAmountInput(form.ocGuaranteeAmount);
  const scanPath = form.formalAttachments.insuranceOc?.path?.trim() || null;
  await upsertContractorAccountSettings(userId, {
    ocValidUntil: form.ocValidUntil.trim() || null,
    ocGuaranteeAmount: parsedAmount,
    ...(scanPath ? { ocPolicyScanPath: scanPath } : {}),
  });
}
