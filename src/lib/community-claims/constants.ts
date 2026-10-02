export const COMMUNITY_CLAIM_SLA_HOURS = 48;

export const COMMUNITY_CLAIM_RESOLUTION_OBJECT_NAME = 'uchwala.pdf';

export const COMMUNITY_CLAIM_MAX_PDF_BYTES = 10 * 1024 * 1024;

export const COMMUNITY_CLAIM_INELIGIBLE_MESSAGE =
  'Nie możemy przyjąć wniosku dla tego NIP. Jeśli wspólnota ma już własne konto, użyj resetu hasła. W innym przypadku sprawdź numer lub skontaktuj się z nami.';

export const COMMUNITY_CLAIM_HAS_OWN_ACCOUNT_MESSAGE =
  'Ta wspólnota ma już własne konto. Użyj resetu hasła na stronie Zapomniane hasło.';

export const COMMUNITY_CLAIM_PENDING_MESSAGE =
  'Wniosek dla tej wspólnoty jest już rozpatrywany. Decyzja zapadnie w ciągu 48 godzin.';

export const COMMUNITY_CLAIM_HOLDING_COPY =
  'Dziękujemy. Administrator rozpatrzy wniosek w ciągu 48 godzin. Wyślemy decyzję na podany adres email.';

export const CLAIMED_ENTITY_ADD_NIP_ERROR =
  'Ta wspólnota odzyskała własne konto i nie może zostać ponownie dodana przez zarządcę';

export const BLOCKED_ENTITY_EDIT_ERROR =
  'Ta wspólnota odzyskała własne konto i nie można jej edytować.';

export const BLOCKED_ENTITY_DELETE_ERROR =
  'Ta wspólnota odzyskała własne konto i nie można jej usunąć.';

export type CommunityClaimStatus = 'pending' | 'approved' | 'rejected';

export type CommunityClaimEligibilityReason =
  | 'ok'
  | 'not_found'
  | 'blocked'
  | 'not_wspolnota'
  | 'has_condo_board'
  | 'pending_exists';

export function communityClaimResolutionPath(claimId: string): string {
  return `claims/${claimId}/${COMMUNITY_CLAIM_RESOLUTION_OBJECT_NAME}`;
}

export function hoursSinceSubmitted(submittedAt: string, nowMs: number): number {
  return (nowMs - new Date(submittedAt).getTime()) / (1000 * 60 * 60);
}

export function isCommunityClaimOverdue(submittedAt: string, nowMs: number): boolean {
  return hoursSinceSubmitted(submittedAt, nowMs) > COMMUNITY_CLAIM_SLA_HOURS;
}

export function describeCommunityClaimEligibility(reason: CommunityClaimEligibilityReason): {
  eligible: boolean;
  message?: string;
} {
  if (reason === 'ok') {
    return { eligible: true };
  }
  if (reason === 'has_condo_board') {
    return { eligible: false, message: COMMUNITY_CLAIM_HAS_OWN_ACCOUNT_MESSAGE };
  }
  if (reason === 'pending_exists') {
    return { eligible: false, message: COMMUNITY_CLAIM_PENDING_MESSAGE };
  }
  return { eligible: false, message: COMMUNITY_CLAIM_INELIGIBLE_MESSAGE };
}
