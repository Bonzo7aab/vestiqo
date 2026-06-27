'use client'

import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { useUserProfile } from '../contexts/AuthContext';
import type { VerificationStatus } from '../lib/database/verification';
import { PasswordForm } from './PasswordForm';
import { ProfileForm } from './ProfileForm';
import { CompanyManagementForm } from './CompanyManagementForm';
import { DeleteAccountSection } from './DeleteAccountSection';
import { ContractorDocumentsTab } from './ContractorDocumentsTab';
import { ContractorServicesTab } from './contractor-account/ContractorServicesTab';
import { needsVerificationAttention } from '../lib/verification/needs-verification-attention';
import type {
  DocumentReviewMap,
  VerificationDocumentEntry,
} from '../lib/database/admin-verification';
import { InAppNotificationSettingsPanel } from './InAppNotificationSettingsPanel';
import { UserAccountHeader } from './UserAccountHeader';
import { Tabs, TabsContent } from './ui/tabs';
import { cn } from './ui/utils';
import { VerificationAttentionIcon } from './VerificationAttentionIcon';
import {
  KONTO_TABS,
  getDefaultKontoTab,
  isDefaultKontoTab,
  resolveKontoTabFromUrl,
  type KontoTab,
} from '../lib/konto-tabs';

interface UserAccountPageClientProps {
  verificationStatus: VerificationStatus;
  verificationDocuments?: VerificationDocumentEntry[];
  documentReviews?: DocumentReviewMap;
  contractorCompanyId?: string | null;
  initialServiceSubcategorySlugs?: string[];
}

export function UserAccountPageClient({
  verificationStatus,
  verificationDocuments = [],
  documentReviews,
  contractorCompanyId = null,
  initialServiceSubcategorySlugs,
}: UserAccountPageClientProps) {
  const { user, isLoading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = React.useState(false);
  
  // Priority 1 & 5: Controlled tabs with URL persistence
  const [activeTab, setActiveTab] = React.useState<KontoTab>(KONTO_TABS.profil);

  const resolveTabFromUrl = React.useCallback(
    (tabFromUrl: string | null): KontoTab | null => resolveKontoTabFromUrl(tabFromUrl, user?.userType),
    [user?.userType],
  );

  // Track client-side mount to prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const applyTabToUrl = React.useCallback(
    (tab: KontoTab) => {
      const params = new URLSearchParams(searchParams.toString());

      if (isDefaultKontoTab(tab, user?.userType)) {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }

      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const qs = params.toString();
      router.replace(qs ? `?${qs}${hash}` : `${window.location.pathname}${hash}`, {
        scroll: false,
      });
    },
    [router, searchParams, user?.userType],
  );

  const handleTabChange = React.useCallback(
    (tab: string) => {
      const resolved = resolveKontoTabFromUrl(tab, user?.userType) ?? getDefaultKontoTab(user?.userType);
      setActiveTab(resolved);
      if (user) {
        applyTabToUrl(resolved);
      }
    },
    [applyTabToUrl, user],
  );

  // URL → state (menu / deep links). useLayoutEffect so we apply before persist-style races.
  React.useLayoutEffect(() => {
    if (!isMounted || !user) return;
    const tabParam = searchParams.get('tab');
    const resolved = resolveTabFromUrl(tabParam);
    if (resolved) {
      setActiveTab(resolved);
      return;
    }
    if (!tabParam) {
      setActiveTab(getDefaultKontoTab(user.userType));
    }
  }, [isMounted, user, searchParams, resolveTabFromUrl]);

  // Scroll to the target anchor (e.g. `#oc-policy`) once the active tab's
  // content has had a chance to render. Runs whenever the active tab changes
  // so re-clicking the OC notice on the same page keeps working.
  React.useEffect(() => {
    if (!isMounted) return;
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const id = hash.slice(1);
    const handle = window.requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    return () => window.cancelAnimationFrame(handle);
  }, [activeTab, isMounted]);

  // Prevent hydration mismatch by not rendering loading state during SSR
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Ładowanie profilu...</p>
        </div>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-sm text-muted-foreground">
            Nie udało się wczytać profilu. Odśwież stronę lub skontaktuj się z administratorem.
          </p>
        </div>
      </div>
    );
  }

  const showDocumentsTabAttention = needsVerificationAttention(user);

  return (
    <div className="min-h-screen bg-gray-50">
      <UserAccountHeader verificationStatus={verificationStatus} />

      {/* Tabs Navigation */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {user.userType === 'contractor' ? (
              <>
                <button
                  onClick={() => handleTabChange(KONTO_TABS.twojeDane)}
                  className={cn(
                    'px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0',
                    activeTab === KONTO_TABS.twojeDane
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  )}
                >
                  Twoje dane
                </button>
                <button
                  onClick={() => handleTabChange(KONTO_TABS.dokumenty)}
                  className={cn(
                    'relative px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0',
                    showDocumentsTabAttention && 'pr-7 sm:pr-4',
                    activeTab === KONTO_TABS.dokumenty
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  )}
                >
                  Dokumenty
                  {showDocumentsTabAttention && (
                    <span
                      className="absolute top-1 -right-0.5 sm:top-1.5 sm:right-0"
                      aria-label="Wymagana weryfikacja dokumentów"
                    >
                      <VerificationAttentionIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-50" />
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleTabChange(KONTO_TABS.uslugi)}
                  className={cn(
                    'px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0',
                    activeTab === KONTO_TABS.uslugi
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  )}
                >
                  Usługi
                </button>
              </>
            ) : (
              <button
                onClick={() => handleTabChange(KONTO_TABS.profil)}
                className={cn(
                  "px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0",
                  activeTab === KONTO_TABS.profil
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                )}
              >
                Twoje dane
              </button>
            )}
            <button
              onClick={() => handleTabChange(KONTO_TABS.bezpieczenstwo)}
              className={cn(
                "px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0",
                activeTab === KONTO_TABS.bezpieczenstwo
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              Bezpieczeństwo
            </button>
            <button
              onClick={() => handleTabChange(KONTO_TABS.powiadomienia)}
              className={cn(
                "px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0",
                activeTab === KONTO_TABS.powiadomienia
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              )}
            >
              Ustawienia powiadomień
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsContent value={KONTO_TABS.profil} className="space-y-6">
            <ProfileForm user={user} includeBusinessData />
            {user.userType === 'manager' && (
              <CompanyManagementForm user={user} managedEntitiesOnly />
            )}
          </TabsContent>

          <TabsContent value={KONTO_TABS.twojeDane} className="space-y-6">
            <ProfileForm user={user} includeBusinessData />
          </TabsContent>

          <TabsContent value={KONTO_TABS.dokumenty} className="space-y-6">
            <ContractorDocumentsTab
              userId={user.id}
              initialStatus={verificationStatus}
              existingDocuments={verificationDocuments}
              documentReviews={documentReviews}
            />
          </TabsContent>

          <TabsContent value={KONTO_TABS.uslugi} className="space-y-6">
            <ContractorServicesTab
              key={initialServiceSubcategorySlugs?.join(',') ?? 'none'}
              companyId={contractorCompanyId}
              initialSubcategorySlugs={initialServiceSubcategorySlugs}
            />
          </TabsContent>

          <TabsContent value={KONTO_TABS.bezpieczenstwo} className="space-y-6">
            <PasswordForm accountEmail={user.email} />
            <DeleteAccountSection />
          </TabsContent>

          <TabsContent value={KONTO_TABS.powiadomienia} className="space-y-6">
            <InAppNotificationSettingsPanel userId={user.id} userType={user.userType} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
