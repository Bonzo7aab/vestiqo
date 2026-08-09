import type { ManagedBuilding } from '../../types/managed-building';
import {
  CHIMNEY_DUCT_TYPE_OPTIONS,
  ROOF_TYPE_OPTIONS,
} from '../../types/managed-building';

export const PRZEGLADY_CATEGORY_NAME = 'Przeglądy';

export const TECH_PARAMS_START = '<!-- vestiqo:tech-params -->';
export const TECH_PARAMS_END = '<!-- /vestiqo:tech-params -->';

export type PrzegladySubcategorySlug =
  | 'przeglad-gazowy-roczny'
  | 'przeglad-kominiarski-wentylacyjny-roczny'
  | 'przeglad-ogolnobudowlany-roczny'
  | 'przeglad-ogolnobudowlany-5-letni'
  | 'przeglad-elektryczny-odgromowy-5-letni'
  | 'przeglad-ppoz-hydrantow-roczny';

const SUBCATEGORY_NAME_TO_SLUG: Record<string, PrzegladySubcategorySlug> = {
  'Przegląd gazowy (roczny)': 'przeglad-gazowy-roczny',
  'Przegląd kominiarski i wentylacyjny (roczny)':
    'przeglad-kominiarski-wentylacyjny-roczny',
  'Przegląd ogólnobudowlany (roczny)': 'przeglad-ogolnobudowlany-roczny',
  'Przegląd ogólnobudowlany (5-letni)': 'przeglad-ogolnobudowlany-5-letni',
  'Przegląd elektryczny i odgromowy (5-letni)':
    'przeglad-elektryczny-odgromowy-5-letni',
  'Przegląd instalacji Ppoż. i hydrantów (roczny)': 'przeglad-ppoz-hydrantow-roczny',
  // slugs also accepted
  'przeglad-gazowy-roczny': 'przeglad-gazowy-roczny',
  'przeglad-kominiarski-wentylacyjny-roczny':
    'przeglad-kominiarski-wentylacyjny-roczny',
  'przeglad-ogolnobudowlany-roczny': 'przeglad-ogolnobudowlany-roczny',
  'przeglad-ogolnobudowlany-5-letni': 'przeglad-ogolnobudowlany-5-letni',
  'przeglad-elektryczny-odgromowy-5-letni': 'przeglad-elektryczny-odgromowy-5-letni',
  'przeglad-ppoz-hydrantow-roczny': 'przeglad-ppoz-hydrantow-roczny',
};

export function isPrzegladyCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  const normalized = category.trim();
  return (
    normalized === PRZEGLADY_CATEGORY_NAME ||
    normalized === 'Przeglądy i Serwis' ||
    normalized === 'Przeglądy i Obsługa Techniczna' ||
    normalized === 'przeglady-obsługa-techniczna'
  );
}

export function resolvePrzegladySubcategorySlug(
  subcategory: string | null | undefined,
): PrzegladySubcategorySlug | null {
  if (!subcategory) return null;
  return SUBCATEGORY_NAME_TO_SLUG[subcategory.trim()] ?? null;
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function formatBool(value: boolean): string {
  return value ? 'Tak' : 'Nie';
}

function roofTypeLabel(building: ManagedBuilding): string {
  if (!building.roof_type) return '—';
  return (
    ROOF_TYPE_OPTIONS.find((option) => option.value === building.roof_type)?.label ??
    building.roof_type
  );
}

function chimneyTypesLabel(building: ManagedBuilding): string {
  if (!building.chimney_duct_types?.length) return '—';
  return building.chimney_duct_types
    .map(
      (type) =>
        CHIMNEY_DUCT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type,
    )
    .join(', ');
}

function formatGasBlock(building: ManagedBuilding): string {
  return [
    'Parametry techniczne (Przegląd Gazowy):',
    `• Liczba lokali z gazem: ${formatValue(building.gas_connected_units)}`,
    `• Liczba pionów gazowych: ${formatValue(building.gas_risers_count)}`,
    `• Kotłownia gazowa: ${formatBool(building.has_own_gas_boilerroom)}`,
  ].join('\n');
}

function formatChimneyBlock(building: ManagedBuilding): string {
  return [
    'Parametry techniczne (Przegląd Kominiarski):',
    `• Liczba punktów/otworów w lokalach: ${formatValue(building.chimney_openings_in_units)}`,
    `• Liczba trzonów kominowych na dachu: ${formatValue(building.chimney_shafts_above_roof)}`,
    `• Rodzaje przewodów: ${chimneyTypesLabel(building)}`,
    `• Dach: ${formatValue(building.roof_area_m2)} m², ${roofTypeLabel(building)}`,
  ].join('\n');
}

function formatElectricalBlock(building: ManagedBuilding): string {
  return [
    'Parametry techniczne (Przegląd Elektryczny i Odgromowy):',
    `• Liczba lokali ogółem: ${formatValue(building.total_residential_units)}`,
    `• Liczba klatek schodowych: ${formatValue(building.staircases_count)}`,
    `• Liczba złączy kontrolnych odgromu: ${formatValue(building.lightning_control_joints)}`,
  ].join('\n');
}

function formatGeneralAnnualBlock(building: ManagedBuilding): string {
  return [
    'Parametry techniczne (Przegląd Ogólnobudowlany Roczny):',
    `• Kondygnacje: ${formatValue(building.above_ground_floors)} nadziemnych / ${formatValue(building.below_ground_floors)} podziemnych`,
    `• Liczba klatek: ${formatValue(building.staircases_count)}`,
    `• Elewacja: ok. ${formatValue(building.facade_area_m2)} m²`,
    `• Dach: ${formatValue(building.roof_area_m2)} m² (${roofTypeLabel(building)})`,
  ].join('\n');
}

function formatGeneral5yBlock(building: ManagedBuilding): string {
  return [
    'Parametry techniczne (Przegląd Ogólnobudowlany 5-letni):',
    `• Liczba lokali ogółem: ${formatValue(building.total_residential_units)} | Klatek: ${formatValue(building.staircases_count)}`,
    `• Kondygnacje: ${formatValue(building.above_ground_floors)} nadziemnych / ${formatValue(building.below_ground_floors)} podziemnych`,
    `• Dach: ${formatValue(building.roof_area_m2)} m² (${roofTypeLabel(building)})`,
    `• Elewacja: ok. ${formatValue(building.facade_area_m2)} m²`,
  ].join('\n');
}

function formatFireBlock(building: ManagedBuilding): string {
  const floorsTotal =
    building.above_ground_floors == null && building.below_ground_floors == null
      ? null
      : (building.above_ground_floors ?? 0) + (building.below_ground_floors ?? 0);

  return [
    'Parametry techniczne (Przegląd Ppoż.):',
    `• Instalacja hydrantowa wewnętrzna: ${formatBool(building.has_internal_hydrant_system)}`,
    `• Liczba kotłowni / węzłów cieplnych: ${formatValue(building.heat_nodes_or_boilerrooms)}`,
    `• Liczba klatek / kondygnacji: ${formatValue(building.staircases_count)} klatek / ${formatValue(floorsTotal)} kondygnacji`,
  ].join('\n');
}

function formatBuildingBlock(
  slug: PrzegladySubcategorySlug,
  building: ManagedBuilding,
): string {
  const body = (() => {
    switch (slug) {
      case 'przeglad-gazowy-roczny':
        return formatGasBlock(building);
      case 'przeglad-kominiarski-wentylacyjny-roczny':
        return formatChimneyBlock(building);
      case 'przeglad-elektryczny-odgromowy-5-letni':
        return formatElectricalBlock(building);
      case 'przeglad-ogolnobudowlany-roczny':
        return formatGeneralAnnualBlock(building);
      case 'przeglad-ogolnobudowlany-5-letni':
        return formatGeneral5yBlock(building);
      case 'przeglad-ppoz-hydrantow-roczny':
        return formatFireBlock(building);
      default:
        return '';
    }
  })();

  return [`### ${building.name}`, body].join('\n');
}

function formatSummary(
  slug: PrzegladySubcategorySlug,
  buildings: ManagedBuilding[],
): string | null {
  if (buildings.length < 2) return null;

  if (slug === 'przeglad-gazowy-roczny') {
    const gasUnits = buildings.reduce(
      (sum, building) => sum + (building.gas_connected_units ?? 0),
      0,
    );
    const risers = buildings.reduce(
      (sum, building) => sum + (building.gas_risers_count ?? 0),
      0,
    );
    return `Łącznie dla wszystkich wybranych budynków: ${gasUnits} lokali z gazem, ${risers} pionów.`;
  }

  if (
    slug === 'przeglad-ogolnobudowlany-roczny' ||
    slug === 'przeglad-ogolnobudowlany-5-letni' ||
    slug === 'przeglad-elektryczny-odgromowy-5-letni'
  ) {
    const units = buildings.reduce(
      (sum, building) => sum + (building.total_residential_units ?? 0),
      0,
    );
    const staircases = buildings.reduce(
      (sum, building) => sum + (building.staircases_count ?? 0),
      0,
    );
    return `Łącznie dla wszystkich wybranych budynków: ${units} lokali, ${staircases} klatek.`;
  }

  return `Łącznie wybrano budynków: ${buildings.length}.`;
}

export function buildPrzegladyTechParamsBlock(
  subcategory: string,
  buildings: ManagedBuilding[],
): string | null {
  const slug = resolvePrzegladySubcategorySlug(subcategory);
  if (!slug || buildings.length === 0) return null;

  const blocks = buildings.map((building) => formatBuildingBlock(slug, building));
  const summary = formatSummary(slug, buildings);
  const body = summary ? [...blocks, summary].join('\n\n') : blocks.join('\n\n');

  return [TECH_PARAMS_START, body, TECH_PARAMS_END].join('\n');
}

export function applyTechParamsToDescription(
  description: string,
  techParamsBlock: string | null,
): string {
  const withoutBlock = stripTechParamsFromDescription(description).trimEnd();

  if (!techParamsBlock) {
    return withoutBlock;
  }

  if (!withoutBlock) {
    return techParamsBlock;
  }

  return `${withoutBlock}\n\n${techParamsBlock}`;
}

export function stripTechParamsFromDescription(description: string): string {
  const start = description.indexOf(TECH_PARAMS_START);
  if (start === -1) return description;

  const end = description.indexOf(TECH_PARAMS_END, start);
  if (end === -1) {
    return description.slice(0, start).trimEnd();
  }

  const before = description.slice(0, start).trimEnd();
  const after = description.slice(end + TECH_PARAMS_END.length).trimStart();
  if (!before) return after;
  if (!after) return before;
  return `${before}\n\n${after}`;
}
