import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { BuildingInspectionType } from '../../types/managed-building';
import { BUILDING_INSPECTION_DEFINITIONS } from '../../types/managed-building';
import { routes } from '../routes';
import { KONTO_NIERUCHOMOSCI_HREF } from '../konto-tabs';
import { buildInspectionContestHref, buildContestPrefillHref } from '../calendar/contest-prefill';
import { toIsoDate } from '../calendar/dates';
import {
  calendarEventStatus,
  isManagerCalendarEventKind,
  sortCalendarEvents,
  type ManagerCalendarEvent,
} from '../calendar/manager-calendar-events';
import { inspectionTypeLabel } from '../calendar/inspection-contest-map';

type DbClient = SupabaseClient<Database>;

interface EntityRow {
  id: string;
  name: string;
}

interface BuildingRow {
  id: string;
  name: string;
  managed_entity_id: string;
}

interface InspectionRow {
  id: string;
  building_id: string;
  inspection_type: string;
  next_inspected_at: string | null;
}

interface ContestRow {
  id: string;
  title: string;
  status: string;
  submission_deadline: string | null;
  managed_entity_id: string | null;
}

interface OrderRow {
  id: string;
  title: string;
  status: string;
  contest_id: string;
  completion_deadline: string | null;
  warranty_expires_at: string | null;
}

function isInspectionType(value: string): value is BuildingInspectionType {
  return BUILDING_INSPECTION_DEFINITIONS.some((definition) => definition.type === value);
}

export async function fetchManagerCalendarEvents(
  supabase: DbClient,
  managerCompanyId: string,
  today = new Date(),
): Promise<ManagerCalendarEvent[]> {
  const events: ManagerCalendarEvent[] = [];

  const { data: entitiesData } = await supabase
    .from('managed_housing_entities')
    .select('id, name')
    .eq('manager_company_id', managerCompanyId);

  const entities = (entitiesData ?? []) as EntityRow[];
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const entityIds = entities.map((entity) => entity.id);

  let buildings: BuildingRow[] = [];
  if (entityIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: buildingsData } = await (supabase as any)
      .from('managed_buildings')
      .select('id, name, managed_entity_id')
      .in('managed_entity_id', entityIds);
    buildings = (buildingsData ?? []) as BuildingRow[];
  }
  const buildingById = new Map(buildings.map((building) => [building.id, building]));
  const buildingIds = buildings.map((building) => building.id);

  if (buildingIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inspectionsData } = await (supabase as any)
      .from('managed_building_inspections')
      .select('id, building_id, inspection_type, next_inspected_at')
      .in('building_id', buildingIds)
      .not('next_inspected_at', 'is', null);

    for (const row of (inspectionsData ?? []) as InspectionRow[]) {
      if (!row.next_inspected_at || !isInspectionType(row.inspection_type)) continue;
      const building = buildingById.get(row.building_id);
      if (!building) continue;
      const entity = entityById.get(building.managed_entity_id);
      const dueOn = toIsoDate(row.next_inspected_at);
      events.push({
        id: `inspection:${row.id}`,
        kind: 'inspection',
        dueOn,
        status: calendarEventStatus(dueOn, today),
        title: inspectionTypeLabel(row.inspection_type),
        entityName: entity?.name ?? 'Nieruchomość',
        entityId: building.managed_entity_id,
        buildingName: building.name,
        buildingId: building.id,
        href: KONTO_NIERUCHOMOSCI_HREF,
        ctaHref: buildInspectionContestHref(
          building.managed_entity_id,
          building.id,
          row.inspection_type,
        ),
        ctaLabel: 'Uruchom konkurs',
        startHour: null,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contestsData } = await (supabase as any)
    .from('contests')
    .select('id, title, status, submission_deadline, managed_entity_id')
    .eq('company_id', managerCompanyId)
    .in('status', ['active', 'evaluation'])
    .not('submission_deadline', 'is', null);

  for (const row of (contestsData ?? []) as ContestRow[]) {
    if (!row.submission_deadline) continue;
    const dueOn = toIsoDate(row.submission_deadline);
    const entity = row.managed_entity_id ? entityById.get(row.managed_entity_id) : undefined;
    events.push({
      id: `contest:${row.id}`,
      kind: 'contest',
      dueOn,
      status: calendarEventStatus(dueOn, today),
      title: `Konkurs: ${row.title}`,
      entityName: entity?.name ?? '—',
      entityId: row.managed_entity_id,
      buildingName: null,
      buildingId: null,
      href: routes.panelZarzadcyKonkursy,
      ctaHref: routes.panelZarzadcyKonkursy,
      ctaLabel: 'Otwórz konkursy',
      startHour: null,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ordersData } = await (supabase as any)
    .from('orders')
    .select('id, title, status, contest_id, completion_deadline, warranty_expires_at')
    .eq('manager_company_id', managerCompanyId)
    .in('status', ['in_progress', 'awaiting_acceptance', 'completed']);

  const orderRows = (ordersData ?? []) as OrderRow[];
  const contestIds = [...new Set(orderRows.map((row) => row.contest_id))];
  const contestEntityById = new Map<string, string | null>();

  if (contestIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderContests } = await (supabase as any)
      .from('contests')
      .select('id, managed_entity_id')
      .in('id', contestIds);
    for (const contest of (orderContests ?? []) as Array<{
      id: string;
      managed_entity_id: string | null;
    }>) {
      contestEntityById.set(contest.id, contest.managed_entity_id);
    }
  }

  for (const row of orderRows) {
    const entityId = contestEntityById.get(row.contest_id) ?? null;
    const entity = entityId ? entityById.get(entityId) : undefined;
    const entityName = entity?.name ?? '—';

    if (
      (row.status === 'in_progress' || row.status === 'awaiting_acceptance') &&
      row.completion_deadline
    ) {
      const dueOn = toIsoDate(row.completion_deadline);
      events.push({
        id: `order:${row.id}`,
        kind: 'order',
        dueOn,
        status: calendarEventStatus(dueOn, today),
        title: `Zamówienie: ${row.title}`,
        entityName,
        entityId,
        buildingName: null,
        buildingId: null,
        href: routes.panelZarzadcyZamowienia,
        ctaHref: routes.panelZarzadcyZamowienia,
        ctaLabel: 'Otwórz zamówienia',
        startHour: null,
      });
    }

    if (row.status === 'completed' && row.warranty_expires_at) {
      const dueOn = toIsoDate(row.warranty_expires_at);
      events.push({
        id: `warranty:${row.id}`,
        kind: 'warranty',
        dueOn,
        status: calendarEventStatus(dueOn, today),
        title: `Gwarancja: ${row.title}`,
        entityName,
        entityId,
        buildingName: null,
        buildingId: null,
        href: routes.panelZarzadcyZamowienia,
        ctaHref: entityId ? buildContestPrefillHref({ entityId }) : routes.dodajKonkurs,
        ctaLabel: 'Nowy konkurs',
        startHour: null,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notesQuery = await (supabase as any)
    .from('manager_calendar_notes')
    .select('id, title, notes, due_on, start_hour, managed_entity_id, event_kind')
    .eq('company_id', managerCompanyId);

  if (notesQuery.error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notesQuery = await (supabase as any)
      .from('manager_calendar_notes')
      .select('id, title, notes, due_on, start_hour, managed_entity_id')
      .eq('company_id', managerCompanyId);
  }

  if (notesQuery.error) {
    console.warn('manager_calendar_notes unavailable:', notesQuery.error.message);
  } else {
    for (const row of (notesQuery.data ?? []) as Array<{
      id: string;
      title: string;
      notes: string | null;
      due_on: string;
      start_hour: number | null;
      managed_entity_id: string | null;
      event_kind?: string | null;
    }>) {
      const entity = row.managed_entity_id ? entityById.get(row.managed_entity_id) : undefined;
      const dueOn = toIsoDate(row.due_on);
      const kind =
        row.event_kind && isManagerCalendarEventKind(row.event_kind)
          ? row.event_kind
          : 'custom';
      events.push({
        id: `custom:${row.id}`,
        kind,
        dueOn,
        status: calendarEventStatus(dueOn, today),
        title: row.title,
        entityName: entity?.name ?? 'Moje wydarzenie',
        entityId: row.managed_entity_id,
        buildingName: null,
        buildingId: null,
        href: routes.panelZarzadcyKalendarz,
        ctaHref: routes.panelZarzadcyKalendarz,
        ctaLabel: null,
        startHour: row.start_hour,
      });
    }
  }

  return sortCalendarEvents(events);
}
