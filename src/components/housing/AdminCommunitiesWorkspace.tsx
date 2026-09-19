'use client';

import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import { HousingCrmWorkspace } from './HousingCrmWorkspace';
import type { ManagedHousingWorkspace } from './useManagedHousingWorkspace';

interface AdminCommunitiesWorkspaceProps {
  copy: ManagedHousingUiCopy;
  workspace: ManagedHousingWorkspace;
}

export function AdminCommunitiesWorkspace({ copy, workspace }: AdminCommunitiesWorkspaceProps) {
  return <HousingCrmWorkspace copy={copy} workspace={workspace} />;
}
