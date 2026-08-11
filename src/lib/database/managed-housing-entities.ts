import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import type {
  ManagedHousingEntity,
  ManagedHousingEntityFormData,
} from '../../types/managed-housing-entity';
import { normalizeNip } from '../gus/nip';

export async function fetchManagerHousingEntities(
  supabase: SupabaseClient<Database>,
  managerCompanyId: string,
): Promise<{ data: ManagedHousingEntity[] | null; error: PostgrestError | null }> {
  try {
    const { data, error } = await supabase
      .from('managed_housing_entities')
      .select('*')
      .eq('manager_company_id', managerCompanyId)
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data: data as ManagedHousingEntity[], error: null };
  } catch (err) {
    console.error('Error fetching managed housing entities:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function isNipRegisteredForManagerCompany(
  supabase: SupabaseClient<Database>,
  managerCompanyId: string,
  nipInput: string,
  excludeEntityId?: string,
): Promise<boolean> {
  const nip = normalizeNip(nipInput);
  if (!nip) return false;

  let query = supabase
    .from('managed_housing_entities')
    .select('id, nip')
    .eq('manager_company_id', managerCompanyId);

  if (excludeEntityId) {
    query = query.neq('id', excludeEntityId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('NIP duplicate check failed:', error.message);
    return false;
  }

  return (data ?? []).some((row) => normalizeNip(String(row.nip)) === nip);
}

export async function createManagedHousingEntity(
  supabase: SupabaseClient<Database>,
  managerCompanyId: string,
  formData: ManagedHousingEntityFormData,
): Promise<{ data: ManagedHousingEntity | null; error: PostgrestError | null }> {
  try {
    const nip = normalizeNip(formData.nip);
    if (!nip) {
      return {
        data: null,
        error: new Error('Nieprawidłowy numer NIP') as PostgrestError,
      };
    }

    if (!formData.name.trim()) {
      return {
        data: null,
        error: new Error('Brak danych firmy — wyszukaj NIP w rejestrze GUS') as PostgrestError,
      };
    }

    const duplicate = await isNipRegisteredForManagerCompany(supabase, managerCompanyId, nip);
    if (duplicate) {
      return {
        data: null,
        error: new Error('Ta nieruchomość jest już na liście') as PostgrestError,
      };
    }

    const insertData: Database['public']['Tables']['managed_housing_entities']['Insert'] = {
      manager_company_id: managerCompanyId,
      entity_type: formData.entity_type,
      nip,
      regon: formData.regon.trim() || null,
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      postal_code: formData.postal_code.trim() || null,
      bank_account_iban: formData.bank_account_iban.trim() || null,
      vat_status: formData.vat_status.trim() || null,
    };

    const { data, error } = await supabase
      .from('managed_housing_entities')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as ManagedHousingEntity, error: null };
  } catch (err) {
    console.error('Error creating managed housing entity:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function updateManagedHousingEntity(
  supabase: SupabaseClient<Database>,
  entityId: string,
  managerCompanyId: string,
  formData: ManagedHousingEntityFormData,
): Promise<{ data: ManagedHousingEntity | null; error: PostgrestError | null }> {
  try {
    const nip = normalizeNip(formData.nip);
    if (!nip) {
      return {
        data: null,
        error: new Error('Nieprawidłowy numer NIP') as PostgrestError,
      };
    }

    if (!formData.name.trim()) {
      return {
        data: null,
        error: new Error('Brak danych firmy — wyszukaj NIP w rejestrze GUS') as PostgrestError,
      };
    }

    const duplicate = await isNipRegisteredForManagerCompany(
      supabase,
      managerCompanyId,
      nip,
      entityId,
    );
    if (duplicate) {
      return {
        data: null,
        error: new Error('Ta nieruchomość jest już na liście') as PostgrestError,
      };
    }

    const updateData: Database['public']['Tables']['managed_housing_entities']['Update'] = {
      entity_type: formData.entity_type,
      nip,
      regon: formData.regon.trim() || null,
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
      postal_code: formData.postal_code.trim() || null,
      bank_account_iban: formData.bank_account_iban.trim() || null,
      vat_status: formData.vat_status.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('managed_housing_entities')
      .update(updateData)
      .eq('id', entityId)
      .eq('manager_company_id', managerCompanyId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as ManagedHousingEntity, error: null };
  } catch (err) {
    console.error('Error updating managed housing entity:', err);
    return { data: null, error: err as PostgrestError };
  }
}

export async function deleteManagedHousingEntity(
  supabase: SupabaseClient<Database>,
  entityId: string,
  managerCompanyId: string,
): Promise<{ success: boolean; error: PostgrestError | null }> {
  try {
    const { error } = await supabase
      .from('managed_housing_entities')
      .delete()
      .eq('id', entityId)
      .eq('manager_company_id', managerCompanyId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting managed housing entity:', err);
    return { success: false, error: err as PostgrestError };
  }
}

/**
 * Public profile fetch for a managed housing entity (OPD-152).
 * Relies on RLS: public when manager company is public or entity has public contests.
 */
export async function fetchManagedHousingEntityById(
  supabase: SupabaseClient<Database>,
  entityId: string,
): Promise<{ data: ManagedHousingEntity | null; error: PostgrestError | null }> {
  const id = entityId?.trim();
  if (!id) {
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('managed_housing_entities')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data: (data as ManagedHousingEntity) ?? null, error: null };
  } catch (err) {
    console.error('Error fetching managed housing entity by id:', err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Fetch multiple managed housing entities by id (for zapisane list).
 */
export async function fetchManagedHousingEntitiesByIds(
  supabase: SupabaseClient<Database>,
  entityIds: string[],
): Promise<{ data: ManagedHousingEntity[]; error: PostgrestError | null }> {
  if (!entityIds.length) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('managed_housing_entities')
      .select('*')
      .in('id', entityIds);

    if (error) {
      return { data: [], error };
    }

    return { data: (data as ManagedHousingEntity[]) ?? [], error: null };
  } catch (err) {
    console.error('Error fetching managed housing entities by ids:', err);
    return { data: [], error: err as PostgrestError };
  }
}
