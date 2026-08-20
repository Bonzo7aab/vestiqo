import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { toIsoDate } from '../calendar/dates';
import {
  isManagerCalendarEventKind,
  type ManagerCalendarEventKind,
} from '../calendar/manager-calendar-events';

type DbClient = SupabaseClient<Database>;

export interface CreateManagerCalendarNoteInput {
  userId: string;
  companyId: string;
  title: string;
  notes: string | null;
  dueOn: string;
  startHour: number | null;
  managedEntityId: string | null;
  eventKind: ManagerCalendarEventKind;
}

export interface CreatedManagerCalendarNote {
  id: string;
  title: string;
  dueOn: string;
  startHour: number | null;
}

export async function createManagerCalendarNote(
  supabase: DbClient,
  input: CreateManagerCalendarNoteInput,
): Promise<{ data: CreatedManagerCalendarNote | null; error: string | null }> {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 200) {
    return { data: null, error: 'Podaj tytuł wydarzenia (max. 200 znaków).' };
  }

  const dueOn = toIsoDate(input.dueOn);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
    return { data: null, error: 'Nieprawidłowa data.' };
  }

  const startHour = input.startHour;
  if (
    startHour !== null &&
    (!Number.isInteger(startHour) || startHour < 0 || startHour > 23)
  ) {
    return { data: null, error: 'Nieprawidłowa godzina.' };
  }

  const notes = input.notes?.trim() ? input.notes.trim().slice(0, 2000) : null;
  const eventKind = isManagerCalendarEventKind(input.eventKind) ? input.eventKind : 'custom';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('manager_calendar_notes')
    .insert({
      user_id: input.userId,
      company_id: input.companyId,
      title,
      notes,
      due_on: dueOn,
      start_hour: startHour,
      managed_entity_id: input.managedEntityId,
      event_kind: eventKind,
    })
    .select('id, title, due_on, start_hour')
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? 'Nie udało się zapisać wydarzenia.',
    };
  }

  const row = data as { id: string; title: string; due_on: string; start_hour: number | null };
  return {
    data: {
      id: row.id,
      title: row.title,
      dueOn: toIsoDate(row.due_on),
      startHour: row.start_hour,
    },
    error: null,
  };
}
