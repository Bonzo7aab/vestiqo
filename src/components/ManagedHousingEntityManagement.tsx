'use client';

import type { ManagedHousingUiCopy } from '../lib/profile/account-role-labels';
import { BoardPropertiesWorkspace } from './housing/BoardPropertiesWorkspace';
import { HousingCrmWorkspace } from './housing/HousingCrmWorkspace';
import { useBoardBuildingsWorkspace } from './housing/useBoardBuildingsWorkspace';
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
  variant = 'admin',
}: ManagedHousingEntityManagementProps) {
  if (variant === 'board') {
    return <BoardHousingManagement companyId={companyId} copy={copy} />;
  }

  return <AdminHousingManagement companyId={companyId} copy={copy} />;
}

function AdminHousingManagement({
  companyId,
  copy,
}: {
  companyId: string;
  copy: ManagedHousingUiCopy;
}) {
  const workspace = useManagedHousingWorkspace(companyId, copy);
  return <HousingCrmWorkspace copy={copy} workspace={workspace} />;
}

function BoardHousingManagement({
  companyId,
  copy,
}: {
  companyId: string;
  copy: ManagedHousingUiCopy;
}) {
  const workspace = useBoardBuildingsWorkspace(companyId, copy);
  return <BoardPropertiesWorkspace copy={copy} workspace={workspace} />;
}
