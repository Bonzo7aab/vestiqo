import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { STORAGE_BUCKETS } from './buckets';
import { createPresignedGetUrl } from './r2/operations';
import { normalizeStorageObjectPath } from './path-utils';

/**
 * Server-only: presigned URL for portfolio images marked public in file_uploads.
 * Used when rendering contractor profiles without requiring viewer login.
 */
export async function getPublicPortfolioImageUrl(
  supabase: SupabaseClient<Database>,
  filePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const objectPath = normalizeStorageObjectPath(filePath, STORAGE_BUCKETS.JOB_ATTACHMENTS);

  const { data } = await supabase
    .from('file_uploads')
    .select('id')
    .eq('file_path', objectPath)
    .eq('is_public', true)
    .maybeSingle();

  if (!data) {
    return null;
  }

  try {
    return await createPresignedGetUrl(STORAGE_BUCKETS.JOB_ATTACHMENTS, objectPath, expiresIn);
  } catch {
    return null;
  }
}

export async function resolvePortfolioImageUrls(
  supabase: SupabaseClient<Database>,
  images: Array<{ file_uploads: { file_path: string } | null } | null> | null | undefined,
): Promise<string[]> {
  if (!images?.length) return [];

  const urls = await Promise.all(
    images.map(async (img) => {
      const filePath = img?.file_uploads?.file_path;
      if (!filePath) return null;
      if (filePath.startsWith('http')) return filePath;
      return getPublicPortfolioImageUrl(supabase, filePath);
    }),
  );

  return urls.filter((url): url is string => Boolean(url));
}
