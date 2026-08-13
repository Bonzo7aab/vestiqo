import { createClient } from '../supabase/client';
import {
  isValidSubcategorySlug,
  subcategoryDisplayNamesFromSlugs,
} from '../config/categoryConfig';
import type { CompanyMetadata } from '../../types/contractor';

function parseMetadata(metadata: unknown): CompanyMetadata {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as CompanyMetadata;
  }
  return {};
}

export function parseServiceSubcategorySlugsFromMetadata(metadata: unknown): string[] {
  const parsed = parseMetadata(metadata);
  const slugs = parsed.service_subcategory_slugs;
  if (!Array.isArray(slugs)) {
    return [];
  }
  return slugs.filter((slug): slug is string => typeof slug === 'string' && isValidSubcategorySlug(slug));
}

export async function fetchContractorServiceSubcategories(
  companyId: string,
): Promise<{ slugs: string[]; error: Error | null }> {
  const supabase = createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: company, error } = await (supabase as any)
      .from('companies')
      .select('metadata')
      .eq('id', companyId)
      .single();

    if (error || !company) {
      return { slugs: [], error: new Error('Nie udało się pobrać danych firmy') };
    }

    return { slugs: parseServiceSubcategorySlugsFromMetadata(company.metadata), error: null };
  } catch (error) {
    return {
      slugs: [],
      error: error instanceof Error ? error : new Error('Nieznany błąd'),
    };
  }
}

export async function updateContractorServiceSubcategories(
  companyId: string,
  slugs: string[],
): Promise<{ data: boolean; error: Error | null }> {
    const uniqueSlugs = [...new Set(slugs)];
  if (uniqueSlugs.length === 0) {
    return { data: false, error: new Error('Wybierz przynajmniej jedną usługę') };
  }
  const invalidSlug = uniqueSlugs.find((slug) => !isValidSubcategorySlug(slug));
  if (invalidSlug) {
    return { data: false, error: new Error(`Nieprawidłowa podkategoria: ${invalidSlug}`) };
  }

  const supabase = createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: company, error: fetchError } = await (supabase as any)
      .from('companies')
      .select('metadata, profile_data')
      .eq('id', companyId)
      .single();

    if (fetchError || !company) {
      return { data: false, error: new Error('Nie udało się pobrać danych firmy') };
    }

    const metadata = parseMetadata(company.metadata);
    const profileData =
      company.profile_data && typeof company.profile_data === 'object' && !Array.isArray(company.profile_data)
        ? (company.profile_data as Record<string, unknown>)
        : {};

    const updatedMetadata: CompanyMetadata = {
      ...metadata,
      service_subcategory_slugs: uniqueSlugs,
    };

    const updatedProfileData = {
      ...profileData,
      specializations: subcategoryDisplayNamesFromSlugs(uniqueSlugs),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('companies')
      .update({
        metadata: updatedMetadata,
        profile_data: updatedProfileData,
      })
      .eq('id', companyId);

    if (updateError) {
      console.error('Error updating contractor service subcategories:', updateError);
      return { data: false, error: new Error('Nie udało się zapisać usług') };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error: flagError } = await supabase
        .from('user_profiles')
        .update({ contractor_services_completed: uniqueSlugs.length > 0 })
        .eq('id', user.id);
      if (flagError) {
        console.error('Error updating contractor_services_completed:', flagError);
      }
    }

    return { data: true, error: null };
  } catch (error) {
    console.error('Error in updateContractorServiceSubcategories:', error);
    return {
      data: false,
      error: error instanceof Error ? error : new Error('Nieznany błąd'),
    };
  }
}
