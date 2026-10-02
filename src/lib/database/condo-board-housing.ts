import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type { ManagedHousingEntity } from '../../types/managed-housing-entity';
import type { ManagedBuilding } from '../../types/managed-building';
import { EMPTY_MANAGED_BUILDING_FORM } from '../../types/managed-building';
import { createManagedHousingEntity, fetchManagerHousingEntities } from './managed-housing-entities';
import { createManagedBuilding, fetchManagedBuildingsForEntity } from './managed-buildings';

type DbClient = SupabaseClient<Database>;

export function formatBuildingDisplayName(input: {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  fallbackName?: string | null;
}): string {
  const address = input.address?.trim() ?? '';
  if (address) return address;
  const fallback = input.fallbackName?.trim() ?? '';
  if (fallback) return fallback;
  const cityLine = [input.postal_code?.trim(), input.city?.trim()].filter(Boolean).join(' ');
  return cityLine || 'Budynek';
}

export function formatBuildingAddressLine(building: {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
}): string {
  const street = building.address?.trim() ?? '';
  const cityLine = [building.postal_code?.trim(), building.city?.trim()].filter(Boolean).join(' ');
  if (street && cityLine) return `${street}, ${cityLine}`;
  return street || cityLine || '—';
}

/**
 * Ensures Zarząd Wspólnoty has a default wspólnota entity (from company NIP/GUS).
 * Idempotent: returns the first existing entity when any are present.
 */
export async function ensureCondoBoardDefaultEntity(
  supabase: DbClient,
  companyId: string,
): Promise<{ data: ManagedHousingEntity | null; error: PostgrestError | null }> {
  const { data: existing, error: fetchError } = await fetchManagerHousingEntities(
    supabase,
    companyId,
  );
  if (fetchError) {
    return { data: null, error: fetchError };
  }
  if (existing && existing.length > 0) {
    return { data: existing[0]!, error: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: company, error: companyError } = await (supabase as any)
    .from('companies')
    .select('id, name, nip, regon, address, city, postal_code')
    .eq('id', companyId)
    .maybeSingle();

  if (companyError) {
    return { data: null, error: companyError as PostgrestError };
  }
  if (!company?.nip || !company?.name) {
    return {
      data: null,
      error: new Error(
        'Brak danych firmy (NIP) — uzupełnij profil, aby dodać budynki',
      ) as PostgrestError,
    };
  }

  return createManagedHousingEntity(supabase, companyId, {
    entity_type: 'wspólnota',
    nip: String(company.nip),
    regon: company.regon ? String(company.regon) : '',
    name: String(company.name),
    address: company.address ? String(company.address) : '',
    city: company.city ? String(company.city) : '',
    postal_code: company.postal_code ? String(company.postal_code) : '',
    bank_account_iban: '',
    vat_status: '',
  });
}

/**
 * If the default entity has an address but no buildings, seed the first building once.
 */
export async function ensureCondoBoardSeedBuilding(
  supabase: DbClient,
  entity: ManagedHousingEntity,
): Promise<{ data: ManagedBuilding | null; created: boolean; error: PostgrestError | null }> {
  const { data: buildings, error: fetchError } = await fetchManagedBuildingsForEntity(
    supabase,
    entity.id,
  );
  if (fetchError) {
    return { data: null, created: false, error: fetchError };
  }
  if (buildings && buildings.length > 0) {
    return { data: buildings[0]!, created: false, error: null };
  }

  const address = entity.address?.trim() ?? '';
  const city = entity.city?.trim() ?? '';
  const postalCode = entity.postal_code?.trim() ?? '';
  if (!address && !city && !postalCode) {
    return { data: null, created: false, error: null };
  }

  const name = formatBuildingDisplayName({
    address,
    city,
    postal_code: postalCode,
    fallbackName: entity.name,
  });

  const { data, error } = await createManagedBuilding(supabase, entity.id, {
    ...EMPTY_MANAGED_BUILDING_FORM,
    name,
    address,
    city,
    postal_code: postalCode,
  });

  return { data, created: Boolean(data), error };
}

/**
 * Registration / backfill: create default entity + first building from GUS address fields.
 */
export async function seedCondoBoardHousingFromGus(
  supabase: DbClient,
  companyId: string,
  gus: {
    nip: string;
    name: string;
    regon?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
  },
): Promise<{ entity: ManagedHousingEntity | null; building: ManagedBuilding | null; error: PostgrestError | null }> {
  const { data: entity, error: entityError } = await createManagedHousingEntity(supabase, companyId, {
    entity_type: 'wspólnota',
    nip: gus.nip,
    regon: gus.regon ?? '',
    name: gus.name,
    address: gus.address ?? '',
    city: gus.city ?? '',
    postal_code: gus.postalCode ?? '',
    bank_account_iban: '',
    vat_status: '',
  });

  if (entityError || !entity) {
    return { entity: null, building: null, error: entityError };
  }

  const address = gus.address?.trim() ?? '';
  const city = gus.city?.trim() ?? '';
  const postalCode = gus.postalCode?.trim() ?? '';

  if (!address && !city && !postalCode) {
    return { entity, building: null, error: null };
  }

  const name = formatBuildingDisplayName({
    address,
    city,
    postal_code: postalCode,
    fallbackName: gus.name,
  });

  const { data: building, error: buildingError } = await createManagedBuilding(
    supabase,
    entity.id,
    {
      ...EMPTY_MANAGED_BUILDING_FORM,
      name,
      address,
      city,
      postal_code: postalCode,
    },
  );

  return { entity, building, error: buildingError };
}
