import {
  computeInspectionStatus,
  worstInspectionStatus,
  type BuildingInspectionStatus,
  type ManagedBuildingInspection,
} from '../../types/managed-building';

export function buildingInspectionStatus(
  inspections: ManagedBuildingInspection[] | undefined,
): BuildingInspectionStatus {
  return worstInspectionStatus(
    (inspections ?? []).map((item) => computeInspectionStatus(item.next_inspected_at)),
  );
}

export function countBuildingsNeedingAttention(
  buildingIds: string[],
  inspectionsByBuildingId: Record<string, ManagedBuildingInspection[]>,
): number {
  return buildingIds.filter((id) => {
    const status = buildingInspectionStatus(inspectionsByBuildingId[id]);
    return status === 'overdue' || status === 'upcoming';
  }).length;
}

export function worstStatusForBuildings(
  buildingIds: string[],
  inspectionsByBuildingId: Record<string, ManagedBuildingInspection[]>,
): BuildingInspectionStatus {
  return worstInspectionStatus(
    buildingIds.map((id) => buildingInspectionStatus(inspectionsByBuildingId[id])),
  );
}
