'use server';

import { getAuthorizedViewUrl } from './authorized-download';

export async function createSignedUrlSafe(path: string, expiresIn = 3600): Promise<string | null> {
  return getAuthorizedViewUrl(path, expiresIn);
}
