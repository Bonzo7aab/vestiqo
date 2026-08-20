import type { BuildingInspectionType } from '../../types/managed-building';
import { resolvePrzegladySubcategorySlug } from '../contest/przeglady-tech-params';
import { routes } from '../routes';
import {
  inspectionTypeToSubcategorySlug,
  PRZEGLADY_CATEGORY_FILTER_KEY,
  subcategorySlugToFilterKey,
} from './inspection-contest-map';

export interface ContestPrefillParams {
  entityId?: string | null;
  buildingId?: string | null;
  subcategorySlug?: string | null;
}

export interface ParsedContestPrefill {
  entityId: string | undefined;
  buildingId: string | undefined;
  categoryFilterKey: string | undefined;
  subcategoryFilterKey: string | undefined;
}

export function buildContestPrefillHref(params: ContestPrefillParams): string {
  const search = new URLSearchParams();
  if (params.entityId) search.set('entityId', params.entityId);
  if (params.buildingId) search.set('buildingId', params.buildingId);
  if (params.subcategorySlug) search.set('subcategory', params.subcategorySlug);
  const qs = search.toString();
  return qs ? `${routes.dodajKonkurs}?${qs}` : routes.dodajKonkurs;
}

export function buildInspectionContestHref(
  entityId: string,
  buildingId: string,
  inspectionType: BuildingInspectionType,
): string {
  return buildContestPrefillHref({
    entityId,
    buildingId,
    subcategorySlug: inspectionTypeToSubcategorySlug(inspectionType),
  });
}

export function parseContestPrefillSearchParams(
  searchParams: { get(name: string): string | null },
): ParsedContestPrefill {
  const entityId = searchParams.get('entityId')?.trim() || undefined;
  const buildingId = searchParams.get('buildingId')?.trim() || undefined;
  const rawSubcategory = searchParams.get('subcategory')?.trim() || undefined;
  const slug = resolvePrzegladySubcategorySlug(rawSubcategory);
  const subcategoryFilterKey = slug ? subcategorySlugToFilterKey(slug) : undefined;

  return {
    entityId,
    buildingId,
    categoryFilterKey: subcategoryFilterKey ? PRZEGLADY_CATEGORY_FILTER_KEY : undefined,
    subcategoryFilterKey,
  };
}
