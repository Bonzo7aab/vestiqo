'use server';

import { createClient } from '../supabase/server';
import { requireAuthenticatedUser } from '../storage/auth';
import type { FormalRequirements } from '../../types/tender-contest';
import {
  resolveContractorDocumentsWithClient,
  type ResolvedContractorFormalContext,
} from './resolve-contractor-documents-server';

export async function resolveContractorDocuments(
  userId: string,
  formal: FormalRequirements,
): Promise<ResolvedContractorFormalContext> {
  await requireAuthenticatedUser(userId);
  const supabase = await createClient();
  return resolveContractorDocumentsWithClient(supabase, userId, formal);
}
