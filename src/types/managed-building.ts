export type RoofType =
  | 'flat_tar_paper'
  | 'flat_membrane'
  | 'sloped_tile'
  | 'sloped_sheet';

export type ChimneyDuctType =
  | 'gravity_ventilation'
  | 'flue_gas'
  | 'smoke_solid_fuel';

export type BuildingInspectionType =
  | 'gas_annual'
  | 'chimney_ventilation_annual'
  | 'general_building_annual'
  | 'general_building_5y'
  | 'electrical_lightning_5y'
  | 'fire_hydrant_annual';

export type BuildingInspectionStatus = 'current' | 'upcoming' | 'overdue' | 'unknown';

export interface ManagedBuilding {
  id: string;
  managed_entity_id: string;
  name: string;
  above_ground_floors: number | null;
  below_ground_floors: number | null;
  roof_area_m2: number | null;
  roof_type: RoofType | null;
  facade_area_m2: number | null;
  gas_connected_units: number | null;
  gas_risers_count: number | null;
  has_own_gas_boilerroom: boolean;
  chimney_openings_in_units: number | null;
  chimney_shafts_above_roof: number | null;
  chimney_duct_types: ChimneyDuctType[];
  total_residential_units: number | null;
  staircases_count: number | null;
  lightning_control_joints: number | null;
  heat_nodes_or_boilerrooms: number | null;
  has_internal_hydrant_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagedBuildingFormData {
  name: string;
  above_ground_floors: string;
  below_ground_floors: string;
  roof_area_m2: string;
  roof_type: RoofType | '';
  facade_area_m2: string;
  gas_connected_units: string;
  gas_risers_count: string;
  has_own_gas_boilerroom: boolean;
  chimney_openings_in_units: string;
  chimney_shafts_above_roof: string;
  chimney_duct_types: ChimneyDuctType[];
  total_residential_units: string;
  staircases_count: string;
  lightning_control_joints: string;
  heat_nodes_or_boilerrooms: string;
  has_internal_hydrant_system: boolean;
}

export interface ManagedBuildingInspection {
  id: string;
  building_id: string;
  inspection_type: BuildingInspectionType;
  last_inspected_at: string | null;
  next_inspected_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ROOF_TYPE_OPTIONS: Array<{ value: RoofType; label: string }> = [
  { value: 'flat_tar_paper', label: 'Płaski - papa' },
  { value: 'flat_membrane', label: 'Płaski - membrana' },
  { value: 'sloped_tile', label: 'Skośny - dachówka' },
  { value: 'sloped_sheet', label: 'Skośny - blacha' },
];

export const CHIMNEY_DUCT_TYPE_OPTIONS: Array<{ value: ChimneyDuctType; label: string }> = [
  { value: 'gravity_ventilation', label: 'Wentylacja grawitacyjna' },
  { value: 'flue_gas', label: 'Przewody spalinowe - gaz' },
  { value: 'smoke_solid_fuel', label: 'Przewody dymowe - paliwo stałe' },
];

export const BUILDING_INSPECTION_DEFINITIONS: Array<{
  type: BuildingInspectionType;
  label: string;
  periodYears: number;
}> = [
  { type: 'gas_annual', label: 'Przegląd gazowy (roczny)', periodYears: 1 },
  {
    type: 'chimney_ventilation_annual',
    label: 'Przegląd kominiarski i wentylacyjny (roczny)',
    periodYears: 1,
  },
  {
    type: 'general_building_annual',
    label: 'Przegląd ogólnobudowlany (roczny)',
    periodYears: 1,
  },
  {
    type: 'general_building_5y',
    label: 'Przegląd ogólnobudowlany (5-letni)',
    periodYears: 5,
  },
  {
    type: 'electrical_lightning_5y',
    label: 'Przegląd elektryczny i odgromowy (5-letni)',
    periodYears: 5,
  },
  {
    type: 'fire_hydrant_annual',
    label: 'Przegląd instalacji Ppoż. i hydrantów (roczny)',
    periodYears: 1,
  },
];

export const EMPTY_MANAGED_BUILDING_FORM: ManagedBuildingFormData = {
  name: '',
  above_ground_floors: '',
  below_ground_floors: '',
  roof_area_m2: '',
  roof_type: '',
  facade_area_m2: '',
  gas_connected_units: '',
  gas_risers_count: '',
  has_own_gas_boilerroom: false,
  chimney_openings_in_units: '',
  chimney_shafts_above_roof: '',
  chimney_duct_types: [],
  total_residential_units: '',
  staircases_count: '',
  lightning_control_joints: '',
  heat_nodes_or_boilerrooms: '',
  has_internal_hydrant_system: false,
};

export function buildingToForm(building: ManagedBuilding): ManagedBuildingFormData {
  return {
    name: building.name,
    above_ground_floors: building.above_ground_floors?.toString() ?? '',
    below_ground_floors: building.below_ground_floors?.toString() ?? '',
    roof_area_m2: building.roof_area_m2?.toString() ?? '',
    roof_type: building.roof_type ?? '',
    facade_area_m2: building.facade_area_m2?.toString() ?? '',
    gas_connected_units: building.gas_connected_units?.toString() ?? '',
    gas_risers_count: building.gas_risers_count?.toString() ?? '',
    has_own_gas_boilerroom: building.has_own_gas_boilerroom,
    chimney_openings_in_units: building.chimney_openings_in_units?.toString() ?? '',
    chimney_shafts_above_roof: building.chimney_shafts_above_roof?.toString() ?? '',
    chimney_duct_types: building.chimney_duct_types ?? [],
    total_residential_units: building.total_residential_units?.toString() ?? '',
    staircases_count: building.staircases_count?.toString() ?? '',
    lightning_control_joints: building.lightning_control_joints?.toString() ?? '',
    heat_nodes_or_boilerrooms: building.heat_nodes_or_boilerrooms?.toString() ?? '',
    has_internal_hydrant_system: building.has_internal_hydrant_system,
  };
}

export function addYearsToDate(isoDate: string, years: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setFullYear(date.getFullYear() + years);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function computeInspectionNextDate(
  lastInspectedAt: string | null,
  periodYears: number,
): string | null {
  if (!lastInspectedAt) return null;
  return addYearsToDate(lastInspectedAt, periodYears);
}

export function computeInspectionStatus(
  nextInspectedAt: string | null,
  today = new Date(),
): BuildingInspectionStatus {
  if (!nextInspectedAt) return 'unknown';
  const next = new Date(`${nextInspectedAt}T00:00:00`);
  if (Number.isNaN(next.getTime())) return 'unknown';

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntil = Math.ceil((next.getTime() - startOfToday.getTime()) / msPerDay);

  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 30) return 'upcoming';
  return 'current';
}

export function inspectionStatusLabel(status: BuildingInspectionStatus): string {
  switch (status) {
    case 'current':
      return 'Aktualny';
    case 'upcoming':
      return 'Zbliża się termin';
    case 'overdue':
      return 'Po terminie';
    default:
      return 'Brak daty';
  }
}
