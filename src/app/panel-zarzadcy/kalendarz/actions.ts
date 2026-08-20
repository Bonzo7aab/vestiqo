'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../../lib/supabase/server';
import { getEffectiveUserContext } from '../../../lib/auth/effective-user';
import { fetchUserPrimaryCompany } from '../../../lib/database/companies';
import { createManagerCalendarNote } from '../../../lib/database/manager-calendar-notes';
import { createNotificationWithPush } from '../../../lib/database/notifications-server';
import { formatPolishDate, formatHourLabel, toIsoDate } from '../../../lib/calendar/dates';
import { isManagerCalendarEventKind } from '../../../lib/calendar/manager-calendar-events';
import {
  CALENDAR_FEATURE_DISABLED_ERROR,
  isCalendarFeatureEnabledForAuthUser,
} from '../../../lib/flagship/calendar-feature';
import { routes } from '../../../lib/routes';

export interface CreateCalendarNotePayload {
  title: string;
  dueOn: string;
  startHour: number | null;
  notes: string;
  managedEntityId: string | null;
  eventKind: string;
}

export async function createCalendarNoteAction(
  payload: CreateCalendarNotePayload,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Wymagane logowanie' };
  }

  if (!(await isCalendarFeatureEnabledForAuthUser(supabase, user))) {
    return { success: false, error: CALENDAR_FEATURE_DISABLED_ERROR };
  }

  const effectiveContext = await getEffectiveUserContext();
  if (effectiveContext?.isImpersonating) {
    return {
      success: false,
      error: 'Nie można dodawać wydarzeń w trybie podglądu konta.',
    };
  }

  const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);
  if (!company) {
    return { success: false, error: 'Brak firmy zarządcy' };
  }

  const eventKind = isManagerCalendarEventKind(payload.eventKind) ? payload.eventKind : 'custom';

  const result = await createManagerCalendarNote(supabase, {
    userId: user.id,
    companyId: company.id,
    title: payload.title,
    notes: payload.notes || null,
    dueOn: payload.dueOn,
    startHour: payload.startHour,
    managedEntityId: payload.managedEntityId,
    eventKind,
  });

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? 'Nie udało się zapisać wydarzenia.' };
  }

  const dueOn = toIsoDate(result.data.dueOn);
  const timePart =
    result.data.startHour !== null ? ` o ${formatHourLabel(result.data.startHour)}` : '';
  await createNotificationWithPush({
    userId: user.id,
    type: 'deadline_reminder',
    title: 'Nowe wydarzenie w kalendarzu',
    message: `${result.data.title} — ${formatPolishDate(dueOn)}${timePart}`,
    actionUrl: routes.panelZarzadcyKalendarz,
    data: {
      sourceKind: eventKind,
      noteId: result.data.id,
      dueOn,
    },
  });

  revalidatePath(routes.panelZarzadcyKalendarz);
  return { success: true };
}
