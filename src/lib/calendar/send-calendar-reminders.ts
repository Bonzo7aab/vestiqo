import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { BuildingInspectionType } from '../../types/managed-building';
import { BUILDING_INSPECTION_DEFINITIONS } from '../../types/managed-building';
import { createNotificationWithPush } from '../database/notifications-server';
import { toIsoDate } from './dates';
import { buildInspectionContestHref } from './contest-prefill';
import { routes } from '../routes';
import {
  buildInspectionReminderMessage,
  buildInspectionReminderTitle,
  buildWarrantyReminderMessage,
  buildWarrantyReminderTitle,
} from './reminder-copy';
import { inspectionTypeLabel } from './inspection-contest-map';
import {
  selectDueReminders,
  type CalendarReminderCandidate,
} from './select-due-reminders';

type AdminClient = SupabaseClient<Database>;

function isInspectionType(value: string): value is BuildingInspectionType {
  return BUILDING_INSPECTION_DEFINITIONS.some((definition) => definition.type === value);
}

async function fetchActiveManagerUserIds(
  supabase: AdminClient,
  companyId: string,
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('role', ['owner', 'manager']);

  return [...new Set(((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id))];
}

async function loadInspectionCandidates(
  supabase: AdminClient,
  today: Date,
): Promise<CalendarReminderCandidate[]> {
  const todayIso = toIsoDate(today);
  const until = new Date(today);
  until.setDate(until.getDate() + 30);
  const untilIso = toIsoDate(until);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inspections } = await (supabase as any)
    .from('managed_building_inspections')
    .select('id, building_id, inspection_type, next_inspected_at')
    .not('next_inspected_at', 'is', null)
    .gte('next_inspected_at', todayIso)
    .lte('next_inspected_at', untilIso);

  const rows = (inspections ?? []) as Array<{
    id: string;
    building_id: string;
    inspection_type: string;
    next_inspected_at: string;
  }>;
  if (rows.length === 0) return [];

  const buildingIds = [...new Set(rows.map((row) => row.building_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: buildings } = await (supabase as any)
    .from('managed_buildings')
    .select('id, name, managed_entity_id')
    .in('id', buildingIds);

  const buildingRows = (buildings ?? []) as Array<{
    id: string;
    name: string;
    managed_entity_id: string;
  }>;
  const entityIds = [...new Set(buildingRows.map((row) => row.managed_entity_id))];
  const { data: entities } = await supabase
    .from('managed_housing_entities')
    .select('id, name, manager_company_id')
    .in('id', entityIds);

  const entityById = new Map(
    ((entities ?? []) as Array<{ id: string; name: string; manager_company_id: string }>).map(
      (entity) => [entity.id, entity],
    ),
  );
  const buildingById = new Map(buildingRows.map((building) => [building.id, building]));

  const candidates: CalendarReminderCandidate[] = [];
  for (const row of rows) {
    if (!isInspectionType(row.inspection_type)) continue;
    const building = buildingById.get(row.building_id);
    if (!building) continue;
    const entity = entityById.get(building.managed_entity_id);
    if (!entity) continue;
    candidates.push({
      sourceKind: 'inspection',
      sourceId: row.id,
      dueOn: toIsoDate(row.next_inspected_at),
      companyId: entity.manager_company_id,
      entityId: entity.id,
      entityName: entity.name,
      buildingId: building.id,
      buildingName: building.name,
      title: inspectionTypeLabel(row.inspection_type),
      actionUrl: buildInspectionContestHref(entity.id, building.id, row.inspection_type),
    });
  }
  return candidates;
}

async function loadWarrantyCandidates(
  supabase: AdminClient,
  today: Date,
): Promise<CalendarReminderCandidate[]> {
  const todayIso = toIsoDate(today);
  const until = new Date(today);
  until.setDate(until.getDate() + 30);
  const untilIso = toIsoDate(until);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders } = await (supabase as any)
    .from('orders')
    .select('id, title, warranty_expires_at, manager_company_id, contest_id')
    .eq('status', 'completed')
    .not('warranty_expires_at', 'is', null)
    .gte('warranty_expires_at', todayIso)
    .lte('warranty_expires_at', untilIso);

  const rows = (orders ?? []) as Array<{
    id: string;
    title: string;
    warranty_expires_at: string;
    manager_company_id: string;
    contest_id: string;
  }>;
  if (rows.length === 0) return [];

  const contestIds = [...new Set(rows.map((row) => row.contest_id))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contests } = await (supabase as any)
    .from('contests')
    .select('id, managed_entity_id')
    .in('id', contestIds);

  const contestEntity = new Map(
    ((contests ?? []) as Array<{ id: string; managed_entity_id: string | null }>).map(
      (contest) => [contest.id, contest.managed_entity_id],
    ),
  );
  const entityIds = [...new Set([...contestEntity.values()].filter(Boolean))] as string[];
  const { data: entities } =
    entityIds.length > 0
      ? await supabase.from('managed_housing_entities').select('id, name').in('id', entityIds)
      : { data: [] };
  const entityNameById = new Map(
    ((entities ?? []) as Array<{ id: string; name: string }>).map((entity) => [
      entity.id,
      entity.name,
    ]),
  );

  return rows.map((row) => {
    const entityId = contestEntity.get(row.contest_id) ?? null;
    return {
      sourceKind: 'warranty' as const,
      sourceId: row.id,
      dueOn: toIsoDate(row.warranty_expires_at),
      companyId: row.manager_company_id,
      entityId,
      entityName: (entityId && entityNameById.get(entityId)) || 'Nieruchomość',
      buildingId: null,
      buildingName: null,
      title: row.title,
      actionUrl: routes.panelZarzadcyZamowienia,
    };
  });
}

async function claimReminderSend(
  supabase: AdminClient,
  userId: string,
  candidate: CalendarReminderCandidate,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('calendar_reminder_sends').insert({
    user_id: userId,
    source_kind: candidate.sourceKind,
    source_id: candidate.sourceId,
    due_on: candidate.dueOn,
  });

  if (!error) return true;
  const code = (error as { code?: string }).code;
  if (code === '23505') return false;
  console.error('calendar_reminder_sends insert failed:', error);
  return false;
}

export async function sendDueCalendarReminders(
  supabase: AdminClient,
  today = new Date(),
): Promise<{ sent: number; skipped: number }> {
  const inspectionCandidates = await loadInspectionCandidates(supabase, today);
  const warrantyCandidates = await loadWarrantyCandidates(supabase, today);
  const due = selectDueReminders([...inspectionCandidates, ...warrantyCandidates], today);

  let sent = 0;
  let skipped = 0;
  const usersByCompany = new Map<string, string[]>();

  for (const candidate of due) {
    let userIds = usersByCompany.get(candidate.companyId);
    if (!userIds) {
      userIds = await fetchActiveManagerUserIds(supabase, candidate.companyId);
      usersByCompany.set(candidate.companyId, userIds);
    }

    const title =
      candidate.sourceKind === 'inspection'
        ? buildInspectionReminderTitle()
        : buildWarrantyReminderTitle();
    const message =
      candidate.sourceKind === 'inspection'
        ? buildInspectionReminderMessage(candidate.title, candidate.entityName, candidate.dueOn)
        : buildWarrantyReminderMessage(candidate.title, candidate.entityName, candidate.dueOn);

    for (const userId of userIds) {
      const claimed = await claimReminderSend(supabase, userId, candidate);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      await createNotificationWithPush({
        supabase,
        userId,
        type: 'deadline_reminder',
        title,
        message,
        actionUrl: candidate.actionUrl,
        priority: 'high',
        data: {
          kind: candidate.sourceKind,
          sourceId: candidate.sourceId,
          dueOn: candidate.dueOn,
          entityId: candidate.entityId,
          buildingId: candidate.buildingId,
        },
      });
      sent += 1;
    }
  }

  return { sent, skipped };
}
