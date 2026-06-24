import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { fetchUserPrimaryCompany } from '../database/companies';
import { STORAGE_BUCKETS, type StorageBucket } from './buckets';
import { normalizeStorageObjectPath, resolveStorageBucket } from './path-utils';

type PathKind =
  | 'bid'
  | 'contest'
  | 'job'
  | 'verification'
  | 'portfolio'
  | 'review'
  | 'building'
  | 'unknown';

interface ParsedStoragePath {
  ownerUserId: string;
  kind: PathKind;
  resourceId?: string;
}

function parseStoragePath(objectKey: string): ParsedStoragePath | null {
  const parts = objectKey.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const ownerUserId = parts[0];
  const segment = parts[1];

  switch (segment) {
    case 'tenders':
      return { ownerUserId, kind: 'bid', resourceId: parts[2] };
    case 'contests':
      return { ownerUserId, kind: 'contest', resourceId: parts[2] };
    case 'zlecenia':
      return { ownerUserId, kind: 'job', resourceId: parts[2] };
    case 'weryfikacja':
      return { ownerUserId, kind: 'verification' };
    case 'portfolio':
      return { ownerUserId, kind: 'portfolio', resourceId: parts[2] };
    case 'reviews':
      return { ownerUserId, kind: 'review', resourceId: parts[2] };
    default:
      if (parts.length >= 2 && !['tenders', 'contests', 'zlecenia', 'weryfikacja', 'portfolio', 'reviews'].includes(segment)) {
        return { ownerUserId, kind: 'building', resourceId: parts[1] };
      }
      return { ownerUserId, kind: 'unknown' };
  }
}

async function isPlatformAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('platform_role')
    .eq('id', userId)
    .maybeSingle();

  return data?.platform_role === 'platform_admin';
}

async function isManagerOfContest(
  supabase: SupabaseClient<Database>,
  userId: string,
  contestId: string,
): Promise<boolean> {
  const { data: company } = await fetchUserPrimaryCompany(supabase, userId);
  if (!company) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contest } = await (supabase as any)
    .from('contests')
    .select('manager_id, company_id')
    .eq('id', contestId)
    .maybeSingle();

  if (!contest) return false;
  return contest.manager_id === userId && contest.company_id === company.id;
}

async function isContractorOnContest(
  supabase: SupabaseClient<Database>,
  userId: string,
  contestId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('contest_offers')
    .select('id')
    .eq('contest_id', contestId)
    .eq('contractor_id', userId)
    .neq('status', 'cancelled')
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

async function canContractorViewContestDocuments(
  supabase: SupabaseClient<Database>,
  userId: string,
  contestId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.user_type !== 'contractor') {
    return false;
  }

  if (await isContractorOnContest(supabase, userId, contestId)) {
    return true;
  }

  // Allow verified contractors to download documentation while evaluating an active contest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contest } = await (supabase as any)
    .from('contests')
    .select('status')
    .eq('id', contestId)
    .maybeSingle();

  return Boolean(contest && ['active', 'evaluation', 'awarded'].includes(contest.status));
}

async function isApplicantOnJob(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('contractor_id', userId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

async function isJobManager(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('jobs')
    .select('manager_id')
    .eq('id', jobId)
    .maybeSingle();

  return data?.manager_id === userId;
}

/**
 * Verifies the caller may read a storage object before issuing a presigned URL (OPD-114).
 */
export async function assertCanReadStorageObject(
  supabase: SupabaseClient<Database>,
  callerId: string,
  path: string,
  bucket?: StorageBucket,
): Promise<void> {
  const resolvedBucket = bucket ?? resolveStorageBucket(path);
  const objectKey = normalizeStorageObjectPath(path, resolvedBucket);
  const parsed = parseStoragePath(objectKey);

  if (!parsed) {
    throw new Error('Nieprawidłowa ścieżka pliku.');
  }

  if (await isPlatformAdmin(supabase, callerId)) {
    return;
  }

  if (parsed.ownerUserId === callerId) {
    return;
  }

  switch (parsed.kind) {
    case 'bid':
    case 'contest': {
      const contestId = parsed.resourceId;
      if (!contestId) {
        throw new Error('Brak uprawnień do tego pliku.');
      }
      if (await isManagerOfContest(supabase, callerId, contestId)) {
        return;
      }
      if (parsed.kind === 'contest' && (await canContractorViewContestDocuments(supabase, callerId, contestId))) {
        return;
      }
      if (parsed.kind === 'bid' && (await isContractorOnContest(supabase, callerId, contestId))) {
        return;
      }
      break;
    }
    case 'job': {
      const jobId = parsed.resourceId;
      if (!jobId) {
        throw new Error('Brak uprawnień do tego pliku.');
      }
      if (await isJobManager(supabase, callerId, jobId)) {
        return;
      }
      if (await isApplicantOnJob(supabase, callerId, jobId)) {
        return;
      }
      break;
    }
    case 'verification':
      throw new Error('Brak uprawnień do tego pliku.');
    case 'portfolio':
    case 'review':
      // Portfolio/review images: owner and admins only unless served via public profile SSR.
      throw new Error('Brak uprawnień do tego pliku.');
    case 'building':
      throw new Error('Brak uprawnień do tego pliku.');
    default:
      break;
  }

  throw new Error('Brak uprawnień do tego pliku.');
}

export { STORAGE_BUCKETS };
