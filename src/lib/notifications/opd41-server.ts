import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { createAdminClientOrNull } from '../supabase/admin';
import { createNotificationWithPush } from '../database/notifications-server';

type NotificationType = Database['public']['Tables']['notifications']['Row']['type'];

export type Opd41NotificationKind =
  | 'manager_contest_question'
  | 'contractor_contest_offer_accepted'
  | 'contractor_contest_offer_rejected'
  | 'contractor_contest_answer'
  | 'manager_contest_ended'
  | 'system_announcement';

const PREFERENCE_COLUMN: Record<
  Exclude<Opd41NotificationKind, 'manager_contest_ended' | 'system_announcement'>,
  keyof Pick<
    Database['public']['Tables']['notification_preferences']['Row'],
    | 'manager_contest_question_notifications'
    | 'contractor_contest_offer_accepted_notifications'
    | 'contractor_contest_offer_rejected_notifications'
    | 'contractor_contest_answer_notifications'
  >
> = {
  manager_contest_question: 'manager_contest_question_notifications',
  contractor_contest_offer_accepted: 'contractor_contest_offer_accepted_notifications',
  contractor_contest_offer_rejected: 'contractor_contest_offer_rejected_notifications',
  contractor_contest_answer: 'contractor_contest_answer_notifications',
};

export function truncateQuestionPreview(text: string, maxLength = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}

export function buildManagerContestQuestionMessage(
  contestTitle: string,
  questionPreview: string,
): string {
  return `Wykonawca pyta o szczegóły techniczne w ${contestTitle}: „${questionPreview}”. Kliknij, aby odpowiedzieć.`;
}

export function buildContractorContestAnswerMessage(contestTitle: string): string {
  return `Zarządca odpowiedział na Twoje pytanie w konkursie ${contestTitle}. Kliknij, aby zobaczyć szczegóły.`;
}

export function buildContractorOfferAcceptedMessage(contestTitle: string): string {
  return `🎉 Gratulacje! Twoja oferta w konkursie ${contestTitle} została zaakceptowana przez Zarządcę. Kliknij, aby pobrać dane kontaktowe i ustalić szczegóły.`;
}

export function buildContractorOfferRejectedMessage(contestTitle: string): string {
  return `Konkurs ${contestTitle} został zakończony. Tym razem Zarządca wybrał inną ofertę lub konkurs został unieważniony. Dziękujemy za udział!`;
}

export function buildLegalAnnouncementMessage(effectiveDate: string): string {
  return `Ważna aktualizacja platformy. Zmiany wchodzą w życie z dniem ${effectiveDate}. Sprawdź szczegóły.`;
}

export function buildMaintenanceAnnouncementMessage(
  date: string,
  fromTime: string,
  toTime: string,
): string {
  return `Przerwa techniczna: W dniu ${date} od godziny ${fromTime} do ${toTime} platforma Vestiqo będzie niedostępna z powodu prac konserwacyjnych.`;
}

export async function shouldCreateInAppNotification(
  userId: string,
  kind: Opd41NotificationKind,
  supabase?: SupabaseClient<Database>,
): Promise<boolean> {
  if (kind === 'manager_contest_ended' || kind === 'system_announcement') {
    return true;
  }

  const client = supabase ?? createAdminClientOrNull();
  if (!client) {
    return true;
  }

  const column = PREFERENCE_COLUMN[kind];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('notification_preferences')
    .select(column)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[shouldCreateInAppNotification]', error);
    return true;
  }

  if (!data) {
    return true;
  }

  const value = data[column];
  return value !== false;
}

export interface CreateOpd41NotificationOptions {
  userId: string;
  kind: Opd41NotificationKind;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionUrl?: string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  supabase?: SupabaseClient<Database>;
}

export async function createOpd41Notification(
  options: CreateOpd41NotificationOptions,
): Promise<{ notificationId: string | null; skipped: boolean }> {
  const shouldCreate = await shouldCreateInAppNotification(
    options.userId,
    options.kind,
    options.supabase,
  );

  if (!shouldCreate) {
    return { notificationId: null, skipped: true };
  }

  const admin = options.supabase ?? createAdminClientOrNull();
  if (!admin) {
    console.warn('[createOpd41Notification] admin client unavailable');
    return { notificationId: null, skipped: false };
  }

  const result = await createNotificationWithPush({
    supabase: admin,
    userId: options.userId,
    type: options.type,
    title: options.title,
    message: options.message,
    data: options.data,
    actionUrl: options.actionUrl ?? undefined,
    priority: options.priority ?? 'normal',
    sendPush: false,
  });

  return {
    notificationId: result.notificationId,
    skipped: false,
  };
}
