import type { Database } from '../../types/database';

export interface InAppNotificationPreferences {
  managerContestQuestionNotifications: boolean;
  contractorContestResolutionNotifications: boolean;
  contractorContestAnswerNotifications: boolean;
}

export const DEFAULT_IN_APP_NOTIFICATION_PREFERENCES: InAppNotificationPreferences = {
  managerContestQuestionNotifications: true,
  contractorContestResolutionNotifications: true,
  contractorContestAnswerNotifications: true,
};

export function mapInAppNotificationPreferences(
  row: Database['public']['Tables']['notification_preferences']['Row'] | null,
): InAppNotificationPreferences {
  if (!row) {
    return DEFAULT_IN_APP_NOTIFICATION_PREFERENCES;
  }

  return {
    managerContestQuestionNotifications:
      row.manager_contest_question_notifications ?? true,
    contractorContestResolutionNotifications:
      row.contractor_contest_resolution_notifications ?? true,
    contractorContestAnswerNotifications:
      row.contractor_contest_answer_notifications ?? true,
  };
}
