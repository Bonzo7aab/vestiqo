import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type {
  BuildingInspectionType,
  ChimneyDuctType,
  ManagedBuilding,
  ManagedBuildingFormData,
  ManagedBuildingInspection,
  RoofType,
} from '../../types/managed-building';
import {
  BUILDING_INSPECTION_DEFINITIONS,
  computeInspectionNextDate,
} from '../../types/managed-building';

type DbClient = SupabaseClient<Database>;

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapBuildingRow(row: Record<string, unknown>): ManagedBuilding {
  const chimneyTypes = Array.isArray(row.chimney_duct_types)
    ? (row.chimney_duct_types as ChimneyDuctType[])
    : [];

  return {
    id: String(row.id),
    managed_entity_id: String(row.managed_entity_id),
    name: String(row.name),
    above_ground_floors:
      typeof row.above_ground_floors === 'number' ? row.above_ground_floors : null,
    below_ground_floors:
      typeof row.below_ground_floors === 'number' ? row.below_ground_floors : null,
    roof_area_m2:
      row.roof_area_m2 == null ? null : Number(row.roof_area_m2),
    roof_type: (row.roof_type as RoofType | null) ?? null,
    facade_area_m2:
      row.facade_area_m2 == null ? null : Number(row.facade_area_m2),
    gas_connected_units:
      typeof row.gas_connected_units === 'number' ? row.gas_connected_units : null,
    gas_risers_count:
      typeof row.gas_risers_count === 'number' ? row.gas_risers_count : null,
    has_own_gas_boilerroom: Boolean(row.has_own_gas_boilerroom),
    chimney_openings_in_units:
      typeof row.chimney_openings_in_units === 'number'
        ? row.chimney_openings_in_units
        : null,
    chimney_shafts_above_roof:
      typeof row.chimney_shafts_above_roof === 'number'
        ? row.chimney_shafts_above_roof
        : null,
    chimney_duct_types: chimneyTypes,
    total_residential_units:
      typeof row.total_residential_units === 'number'
        ? row.total_residential_units
        : null,
    staircases_count:
      typeof row.staircases_count === 'number' ? row.staircases_count : null,
    lightning_control_joints:
      typeof row.lightning_control_joints === 'number'
        ? row.lightning_control_joints
        : null,
    heat_nodes_or_boilerrooms:
      typeof row.heat_nodes_or_boilerrooms === 'number'
        ? row.heat_nodes_or_boilerrooms
        : null,
    has_internal_hydrant_system: Boolean(row.has_internal_hydrant_system),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapInspectionRow(row: Record<string, unknown>): ManagedBuildingInspection {
  return {
    id: String(row.id),
    building_id: String(row.building_id),
    inspection_type: row.inspection_type as BuildingInspectionType,
    last_inspected_at:
      row.last_inspected_at == null ? null : String(row.last_inspected_at),
    next_inspected_at:
      row.next_inspected_at == null ? null : String(row.next_inspected_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function formToBuildingPayload(formData: ManagedBuildingFormData) {
  return {
    name: formData.name.trim(),
    above_ground_floors: parseOptionalInt(formData.above_ground_floors),
    below_ground_floors: parseOptionalInt(formData.below_ground_floors),
    roof_area_m2: parseOptionalNumber(formData.roof_area_m2),
    roof_type: formData.roof_type || null,
    facade_area_m2: parseOptionalNumber(formData.facade_area_m2),
    gas_connected_units: parseOptionalInt(formData.gas_connected_units),
    gas_risers_count: parseOptionalInt(formData.gas_risers_count),
    has_own_gas_boilerroom: formData.has_own_gas_boilerroom,
    chimney_openings_in_units: parseOptionalInt(formData.chimney_openings_in_units),
    chimney_shafts_above_roof: parseOptionalInt(formData.chimney_shafts_above_roof),
    chimney_duct_types: formData.chimney_duct_types,
    total_residential_units: parseOptionalInt(formData.total_residential_units),
    staircases_count: parseOptionalInt(formData.staircases_count),
    lightning_control_joints: parseOptionalInt(formData.lightning_control_joints),
    heat_nodes_or_boilerrooms: parseOptionalInt(formData.heat_nodes_or_boilerrooms),
    has_internal_hydrant_system: formData.has_internal_hydrant_system,
  };
}

async function ensureDefaultInspections(
  supabase: DbClient,
  buildingId: string,
): Promise<void> {
  const rows = BUILDING_INSPECTION_DEFINITIONS.map((def) => ({
    building_id: buildingId,
    inspection_type: def.type,
    last_inspected_at: null,
    next_inspected_at: null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('managed_building_inspections').upsert(rows, {
    onConflict: 'building_id,inspection_type',
    ignoreDuplicates: true,
  });
}

export async function fetchManagedBuildingsForEntity(
  supabase: DbClient,
  managedEntityId: string,
): Promise<{ data: ManagedBuilding[] | null; error: PostgrestError | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('managed_buildings')
      .select('*')
      .eq('managed_entity_id', managedEntityId)
      .order('name', { ascending: true });

    if (error) return { data: null, error };
    return {
      data: ((data as Record<string, unknown>[]) ?? []).map(mapBuildingRow),
      error: null,
    };
  } catch (err) {
    console.error('Error fetching managed buildings:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function createManagedBuilding(
  supabase: DbClient,
  managedEntityId: string,
  formData: ManagedBuildingFormData,
): Promise<{ data: ManagedBuilding | null; error: PostgrestError | null }> {
  try {
    if (!formData.name.trim()) {
      return {
        data: null,
        error: new Error('Podaj nazwę / identyfikator budynku') as PostgrestError,
      };
    }

    const payload = {
      managed_entity_id: managedEntityId,
      ...formToBuildingPayload(formData),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('managed_buildings')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error };

    const building = mapBuildingRow(data as Record<string, unknown>);
    await ensureDefaultInspections(supabase, building.id);
    return { data: building, error: null };
  } catch (err) {
    console.error('Error creating managed building:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function updateManagedBuilding(
  supabase: DbClient,
  buildingId: string,
  managedEntityId: string,
  formData: ManagedBuildingFormData,
): Promise<{ data: ManagedBuilding | null; error: PostgrestError | null }> {
  try {
    if (!formData.name.trim()) {
      return {
        data: null,
        error: new Error('Podaj nazwę / identyfikator budynku') as PostgrestError,
      };
    }

    const payload = {
      ...formToBuildingPayload(formData),
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('managed_buildings')
      .update(payload)
      .eq('id', buildingId)
      .eq('managed_entity_id', managedEntityId)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapBuildingRow(data as Record<string, unknown>), error: null };
  } catch (err) {
    console.error('Error updating managed building:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function deleteManagedBuilding(
  supabase: DbClient,
  buildingId: string,
  managedEntityId: string,
): Promise<{ success: boolean; error: PostgrestError | null }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('managed_buildings')
      .delete()
      .eq('id', buildingId)
      .eq('managed_entity_id', managedEntityId);

    if (error) return { success: false, error };
    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting managed building:', err);
    return { success: false, error: err as PostgrestError };
  }
}

export async function fetchBuildingInspections(
  supabase: DbClient,
  buildingId: string,
): Promise<{ data: ManagedBuildingInspection[] | null; error: PostgrestError | null }> {
  try {
    await ensureDefaultInspections(supabase, buildingId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('managed_building_inspections')
      .select('*')
      .eq('building_id', buildingId);

    if (error) return { data: null, error };

    const byType = new Map(
      ((data as Record<string, unknown>[]) ?? []).map((row) => {
        const mapped = mapInspectionRow(row);
        return [mapped.inspection_type, mapped] as const;
      }),
    );

    const ordered = BUILDING_INSPECTION_DEFINITIONS.map((def) => {
      const existing = byType.get(def.type);
      if (existing) return existing;
      return {
        id: `${buildingId}-${def.type}`,
        building_id: buildingId,
        inspection_type: def.type,
        last_inspected_at: null,
        next_inspected_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies ManagedBuildingInspection;
    });

    return { data: ordered, error: null };
  } catch (err) {
    console.error('Error fetching building inspections:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function upsertBuildingInspectionDate(
  supabase: DbClient,
  buildingId: string,
  inspectionType: BuildingInspectionType,
  lastInspectedAt: string | null,
): Promise<{ data: ManagedBuildingInspection | null; error: PostgrestError | null }> {
  try {
    const def = BUILDING_INSPECTION_DEFINITIONS.find((d) => d.type === inspectionType);
    if (!def) {
      return {
        data: null,
        error: new Error('Nieznany typ przeglądu') as PostgrestError,
      };
    }

    const nextInspectedAt = computeInspectionNextDate(lastInspectedAt, def.periodYears);
    const payload = {
      building_id: buildingId,
      inspection_type: inspectionType,
      last_inspected_at: lastInspectedAt,
      next_inspected_at: nextInspectedAt,
      updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('managed_building_inspections')
      .upsert(payload, { onConflict: 'building_id,inspection_type' })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapInspectionRow(data as Record<string, unknown>), error: null };
  } catch (err) {
    console.error('Error upserting building inspection:', err);
    return { data: null, error: err as PostgrestError };
  }
}
