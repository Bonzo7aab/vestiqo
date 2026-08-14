import { isDateInReminderWindow } from './dates';

export type CalendarReminderSourceKind = 'inspection' | 'warranty';

export interface CalendarReminderCandidate {
  sourceKind: CalendarReminderSourceKind;
  sourceId: string;
  dueOn: string;
  companyId: string;
  entityId: string | null;
  entityName: string;
  buildingId: string | null;
  buildingName: string | null;
  title: string;
  actionUrl: string;
}

export function selectDueReminders(
  candidates: CalendarReminderCandidate[],
  today = new Date(),
): CalendarReminderCandidate[] {
  return candidates.filter((candidate) => isDateInReminderWindow(candidate.dueOn, today));
}
