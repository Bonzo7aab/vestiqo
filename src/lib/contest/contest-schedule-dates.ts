export const EVALUATION_DAY_OFFSET_OPTIONS = [3, 7, 14, 30] as const;
export const COMPLETION_DAY_OFFSET_OPTIONS = [7, 14, 30, 60] as const;

export function startOfCalendarDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addCalendarDays(date: Date, days: number): Date {
  const d = startOfCalendarDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function minEvaluationDateAfterSubmission(submission: Date): Date {
  return addCalendarDays(submission, 1);
}

export function minCompletionDateAfterEvaluation(evaluation: Date): Date {
  return addCalendarDays(evaluation, 1);
}

export function isDateOnOrBefore(reference: Date, compare: Date): boolean {
  return startOfCalendarDay(compare).getTime() <= startOfCalendarDay(reference).getTime();
}

export function formatScheduleOffsetLabel(days: number): string {
  if (days === 1) return '+1 dzień';
  return `+${days} dni`;
}

export function evaluationDateFromSubmissionOffset(submission: Date, offsetDays: number): Date {
  return addCalendarDays(submission, offsetDays);
}

export function completionDateFromEvaluationOffset(evaluation: Date, offsetDays: number): Date {
  return addCalendarDays(evaluation, offsetDays);
}
