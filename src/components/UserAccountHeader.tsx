'use client';

import { Clock, ShieldCheck, ShieldX, User } from 'lucide-react';
import { useUserProfile } from '../contexts/AuthContext';
import type { VerificationStatus } from '../lib/database/verification';
import { verificationStatusBadgeClass, verificationStatusLabel } from '../lib/verification/status';
import { getAccountRoleDisplayLabel } from '../lib/profile/account-role-labels';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from './ui/utils';
import { VerificationAttentionIcon } from './VerificationAttentionIcon';

interface UserAccountHeaderProps {
  verificationStatus?: VerificationStatus;
}

export function UserAccountHeader({ verificationStatus }: UserAccountHeaderProps) {
  const { user, isLoading } = useUserProfile();

  if (isLoading || !user) {
    return (
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = getAccountRoleDisplayLabel({
    userType: user.userType,
    accountRole: user.accountRole,
    organizationType: user.organizationType,
  });

  return (
    <div className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <div className="relative flex-shrink-0">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20">
                <AvatarFallback className="bg-primary text-white text-sm sm:text-lg md:text-xl">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 mb-1.5 sm:mb-2">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-words">
                  {user.firstName} {user.lastName}
                </h1>
              </div>
              <p className="text-gray-600 mb-1.5 sm:mb-2 md:mb-1 text-xs sm:text-sm md:text-base break-words">
                {user.email}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:gap-6 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center">
                  <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                  <span>{roleLabel}</span>
                </div>
                {user.userType === 'contractor' && verificationStatus && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-medium rounded-full border px-2 py-0.5 text-xs',
                      verificationStatusBadgeClass(verificationStatus.state),
                    )}
                  >
                    {verificationStatus.state === 'approved' && (
                      <ShieldCheck className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                    )}
                    {verificationStatus.state === 'pending' && (
                      <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                    )}
                    {verificationStatus.state === 'rejected' && (
                      <ShieldX className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                    )}
                    {verificationStatus.state === 'unsubmitted' && (
                      <VerificationAttentionIcon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                    )}
                    {verificationStatusLabel(verificationStatus.state)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
