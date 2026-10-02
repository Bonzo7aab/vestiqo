import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database';
import { COMMUNITY_CLAIM_SLA_HOURS, isCommunityClaimOverdue } from '../community-claims/constants';

export interface CommunityAccountClaimRow {
  id: string;
  managed_entity_id: string;
  nip: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  resolution_path: string;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  decided_by: string | null;
  reject_reason: string | null;
  created_user_id: string | null;
  gus_snapshot: Database['public']['Tables']['community_account_claims']['Row']['gus_snapshot'];
}

export interface CommunityAccountClaimQueueItem extends CommunityAccountClaimRow {
  entityName: string;
  entityType: string;
  managerCompanyName: string | null;
  managerCompanyId: string;
  hoursPending: number;
  isOverdue: boolean;
}

function toClaimRow(
  row: Database['public']['Tables']['community_account_claims']['Row'],
): CommunityAccountClaimRow {
  return {
    id: row.id,
    managed_entity_id: row.managed_entity_id,
    nip: row.nip,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    resolution_path: row.resolution_path,
    status: row.status,
    submitted_at: row.submitted_at,
    decided_at: row.decided_at,
    decided_by: row.decided_by,
    reject_reason: row.reject_reason,
    created_user_id: row.created_user_id,
    gus_snapshot: row.gus_snapshot,
  };
}

export async function fetchCommunityAccountClaims(
  supabase: SupabaseClient<Database>,
  status: 'pending' | 'approved' | 'rejected',
  nowMs = Date.now(),
): Promise<CommunityAccountClaimQueueItem[]> {
  const { data, error } = await supabase
    .from('community_account_claims')
    .select('*')
    .eq('status', status)
    .order('submitted_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map(toClaimRow);
  if (rows.length === 0) {
    return [];
  }

  const entityIds = [...new Set(rows.map((row) => row.managed_entity_id))];
  const { data: entities, error: entitiesError } = await supabase
    .from('managed_housing_entities')
    .select('id, name, entity_type, manager_company_id')
    .in('id', entityIds);

  if (entitiesError) {
    throw entitiesError;
  }

  const entityById = new Map((entities ?? []).map((entity) => [entity.id, entity]));
  const companyIds = [
    ...new Set((entities ?? []).map((entity) => entity.manager_company_id).filter(Boolean)),
  ];

  const companyNameById = new Map<string, string>();
  if (companyIds.length > 0) {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);
    if (companiesError) {
      throw companiesError;
    }
    for (const company of companies ?? []) {
      companyNameById.set(company.id, company.name);
    }
  }

  return rows.map((row) => {
    const entity = entityById.get(row.managed_entity_id);
    const hoursPending = (nowMs - new Date(row.submitted_at).getTime()) / (1000 * 60 * 60);
    return {
      ...row,
      entityName: entity?.name ?? 'Nieznana wspólnota',
      entityType: entity?.entity_type ?? 'wspólnota',
      managerCompanyId: entity?.manager_company_id ?? '',
      managerCompanyName: entity ? (companyNameById.get(entity.manager_company_id) ?? null) : null,
      hoursPending,
      isOverdue: isCommunityClaimOverdue(row.submitted_at, nowMs),
    };
  });
}

export async function fetchCommunityAccountClaimById(
  supabase: SupabaseClient<Database>,
  claimId: string,
  nowMs = Date.now(),
): Promise<CommunityAccountClaimQueueItem | null> {
  const { data, error } = await supabase
    .from('community_account_claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const items = await fetchCommunityAccountClaims(
    supabase,
    data.status as 'pending' | 'approved' | 'rejected',
    nowMs,
  );
  return items.find((item) => item.id === claimId) ?? {
    ...toClaimRow(data),
    entityName: 'Nieznana wspólnota',
    entityType: 'wspólnota',
    managerCompanyId: '',
    managerCompanyName: null,
    hoursPending: (nowMs - new Date(data.submitted_at).getTime()) / (1000 * 60 * 60),
    isOverdue: isCommunityClaimOverdue(data.submitted_at, nowMs),
  };
}

export function claimSlaLabel(item: Pick<CommunityAccountClaimQueueItem, 'hoursPending' | 'isOverdue'>): string {
  const hours = Math.max(0, Math.floor(item.hoursPending));
  if (item.isOverdue) {
    return `Po terminie (${hours} h / ${COMMUNITY_CLAIM_SLA_HOURS} h)`;
  }
  return `${hours} h z ${COMMUNITY_CLAIM_SLA_HOURS} h`;
}
