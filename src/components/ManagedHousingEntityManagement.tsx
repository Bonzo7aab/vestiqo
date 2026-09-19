'use client';

import type { ManagedHousingUiCopy } from '../lib/profile/account-role-labels';
import { HousingCrmWorkspace } from './housing/HousingCrmWorkspace';
import { useManagedHousingWorkspace } from './housing/useManagedHousingWorkspace';

export type HousingWorkspaceVariant = 'admin' | 'board';

interface ManagedHousingEntityManagementProps {
  companyId: string;
  copy: ManagedHousingUiCopy;
  variant?: HousingWorkspaceVariant;
}

export function ManagedHousingEntityManagement({
  companyId,
  copy,
}: ManagedHousingEntityManagementProps) {
  const workspace = useManagedHousingWorkspace(companyId, copy);
  return <HousingCrmWorkspace copy={copy} workspace={workspace} />;
}
