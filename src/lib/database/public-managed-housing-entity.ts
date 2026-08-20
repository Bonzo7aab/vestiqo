import type { ManagedHousingEntityType } from '../../types/managed-housing-entity';

export const PUBLIC_MANAGED_HOUSING_ENTITY_COLUMNS = [
  'id',
  'entity_type',
  'name',
  'address',
  'city',
  'postal_code',
] as const;

export const PUBLIC_MANAGED_HOUSING_ENTITY_SELECT =
  PUBLIC_MANAGED_HOUSING_ENTITY_COLUMNS.join(', ');

export interface PublicManagedHousingEntity {
  id: string;
  entity_type: ManagedHousingEntityType;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

function isManagedHousingEntityType(value: unknown): value is ManagedHousingEntityType {
  return value === 'wspólnota' || value === 'spółdzielnia';
}

export function toPublicManagedHousingEntity(
  value: unknown,
): PublicManagedHousingEntity | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string') {
    return null;
  }
  if (!isManagedHousingEntityType(row.entity_type)) {
    return null;
  }

  return {
    id: row.id,
    entity_type: row.entity_type,
    name: row.name,
    address: typeof row.address === 'string' ? row.address : null,
    city: typeof row.city === 'string' ? row.city : null,
    postal_code: typeof row.postal_code === 'string' ? row.postal_code : null,
  };
}
