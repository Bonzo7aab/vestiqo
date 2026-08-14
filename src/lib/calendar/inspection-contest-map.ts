import type { BuildingInspectionType } from '../../types/managed-building';
import { BUILDING_INSPECTION_DEFINITIONS } from '../../types/managed-building';
import {
  PRZEGLADY_CATEGORY_NAME,
  type PrzegladySubcategorySlug,
  resolvePrzegladySubcategorySlug,
} from '../contest/przeglady-tech-params';

export const PRZEGLADY_CATEGORY_FILTER_KEY = PRZEGLADY_CATEGORY_NAME;

const INSPECTION_TYPE_TO_SLUG: Record<BuildingInspectionType, PrzegladySubcategorySlug> = {
  gas_annual: 'przeglad-gazowy-roczny',
  chimney_ventilation_annual: 'przeglad-kominiarski-wentylacyjny-roczny',
  general_building_annual: 'przeglad-ogolnobudowlany-roczny',
  general_building_5y: 'przeglad-ogolnobudowlany-5-letni',
  electrical_lightning_5y: 'przeglad-elektryczny-odgromowy-5-letni',
  fire_hydrant_annual: 'przeglad-ppoz-hydrantow-roczny',
};

const SLUG_TO_INSPECTION_TYPE: Record<PrzegladySubcategorySlug, BuildingInspectionType> =
  Object.fromEntries(
    Object.entries(INSPECTION_TYPE_TO_SLUG).map(([type, slug]) => [slug, type]),
  ) as Record<PrzegladySubcategorySlug, BuildingInspectionType>;

export function inspectionTypeToSubcategorySlug(
  type: BuildingInspectionType,
): PrzegladySubcategorySlug {
  return INSPECTION_TYPE_TO_SLUG[type];
}

export function inspectionTypeToSubcategoryFilterKey(type: BuildingInspectionType): string {
  return (
    BUILDING_INSPECTION_DEFINITIONS.find((definition) => definition.type === type)?.label ??
    type
  );
}

export function inspectionTypeLabel(type: BuildingInspectionType): string {
  return inspectionTypeToSubcategoryFilterKey(type);
}

export function subcategoryToInspectionType(
  subcategory: string | null | undefined,
): BuildingInspectionType | null {
  const slug = resolvePrzegladySubcategorySlug(subcategory);
  if (!slug) return null;
  return SLUG_TO_INSPECTION_TYPE[slug] ?? null;
}

export function subcategorySlugToFilterKey(
  slug: PrzegladySubcategorySlug,
): string {
  const type = SLUG_TO_INSPECTION_TYPE[slug];
  return type ? inspectionTypeToSubcategoryFilterKey(type) : slug;
}
