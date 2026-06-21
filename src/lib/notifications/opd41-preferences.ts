import type { Database } from '../../types/database';

export interface InAppNotificationPreferences {
  managerContestQuestionNotifications: boolean;
  contractorContestOfferAcceptedNotifications: boolean;
  contractorContestOfferRejectedNotifications: boolean;
  contractorContestAnswerNotifications: boolean;
}

export const DEFAULT_IN_APP_NOTIFICATION_PREFERENCES: InAppNotificationPreferences = {
  managerContestQuestionNotifications: true,
  contractorContestOfferAcceptedNotifications: true,
  contractorContestOfferRejectedNotifications: true,
  contractorContestAnswerNotifications: true,
};

export function mapInAppNotificationPreferences(
  row: Database['public']['Tables']['notification_preferences']['Row'] | null,
): InAppNotificationPreferences {
  if (!row) {
    return DEFAULT_IN_APP_NOTIFICATION_PREFERENCES;
  }

  const legacyResolution = row.contractor_contest_resolution_notifications ?? true;

  return {
    managerContestQuestionNotifications:
      row.manager_contest_question_notifications ?? true,
    contractorContestOfferAcceptedNotifications:
      row.contractor_contest_offer_accepted_notifications ??
      legacyResolution,
    contractorContestOfferRejectedNotifications:
      row.contractor_contest_offer_rejected_notifications ??
      legacyResolution,
    contractorContestAnswerNotifications:
      row.contractor_contest_answer_notifications ?? true,
  };
}
