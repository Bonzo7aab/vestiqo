export type ManagedHousingEntityType = 'wspólnota' | 'spółdzielnia';

export interface ManagedHousingEntity {
  id: string;
  manager_company_id: string;
  entity_type: ManagedHousingEntityType;
  nip: string;
  regon: string | null;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  bank_account_iban: string | null;
  vat_status: string | null;
  management_blocked_at: string | null;
  claimed_company_id: string | null;
  created_at: string;
  updated_at: string;
}

export function isManagedHousingEntityBlocked(
  entity: Pick<ManagedHousingEntity, 'management_blocked_at'>,
): boolean {
  return entity.management_blocked_at != null;
}

export function filterActiveManagedHousingEntities<
  T extends Pick<ManagedHousingEntity, 'management_blocked_at'>,
>(entities: T[]): T[] {
  return entities.filter((entity) => !isManagedHousingEntityBlocked(entity));
}

export interface ManagedHousingEntityFormData {
  entity_type: ManagedHousingEntityType;
  nip: string;
  regon: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  bank_account_iban: string;
  vat_status: string;
}

export const MANAGED_HOUSING_ENTITY_TYPE_OPTIONS: Array<{
  value: ManagedHousingEntityType;
  label: string;
}> = [
  { value: 'wspólnota', label: 'Wspólnota Mieszkaniowa' },
  { value: 'spółdzielnia', label: 'Spółdzielnia Mieszkaniowa' },
];

export function formatManagedHousingEntityType(type: ManagedHousingEntityType): string {
  return MANAGED_HOUSING_ENTITY_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function formatManagedHousingEntitySelectLabel(entity: Pick<
  ManagedHousingEntity,
  'name' | 'nip'
>): string {
  return `${entity.name} · NIP ${entity.nip}`;
}
