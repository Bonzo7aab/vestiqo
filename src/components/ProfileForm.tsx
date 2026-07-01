'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Building2, Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { createClient } from '../lib/supabase/client';
import { fetchUserPrimaryCompany } from '../lib/database/companies';
import {
  ensureUserFinanceFromCompanyNipAction,
  getUserFinanceSettingsAction,
} from '../lib/mf-vat-whitelist/actions';
import { updateUserAction } from '../lib/auth/actions';
import { VAT_STATUS_OPTIONS } from '../lib/contractor/constants';
import { formatIbanDisplay } from '../lib/contractor/iban';
import {
  isValidPolishPhone,
  POLISH_PHONE_INVALID_MESSAGE,
} from '../lib/phone/polish-phone';
import type { AuthUser } from '../types/auth';
import { useUserProfile } from '../contexts/AuthContext';
import { ContractorServiceAreaSettings } from './ContractorServiceAreaSettings';
import { getProfileSectionLabels } from '../lib/profile/account-role-labels';
import { cn } from './ui/utils';
import { verifyCompanyRegistryAction, getCompanyRegistrySnapshotAction } from '../lib/registry/actions';
import { buildCompanyRegistrySnapshot } from '../lib/registry/build-snapshot-from-rows';
import {
  BUSINESS_STATUS_TOOLTIPS,
  FINANCE_STATUS_TOOLTIPS,
  resolveRegistryVerificationState,
} from '../lib/registry/resolve-registry-verification-status';
import type { CompanyRegistrySnapshot } from '../lib/registry/types';
import { RegistryStatusPill } from './registry/RegistryStatusPill';
import {
  getProfileBusinessDataCache,
  isProfileBusinessDataCacheFresh,
  setProfileBusinessDataCache,
  type ProfileBusinessData,
} from '../lib/profile/profile-business-data-cache';

interface ProfileFormProps {
  user: AuthUser;
  /** Show company and finance data (contractors on „Twoje dane”, managers on „Profil”). */
  includeBusinessData?: boolean;
}

function ReadOnlyValue({
  value,
  icon,
  emptyLabel = '—',
}: {
  value: string | null | undefined;
  icon?: React.ReactNode;
  emptyLabel?: string;
}) {
  const display = value?.trim() || emptyLabel;
  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-muted rounded-md min-h-[2.5rem]">
      {icon}
      <p className={cn('text-sm', !value?.trim() && 'text-muted-foreground')}>{display}</p>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  icon,
  emptyLabel,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ReadOnlyValue value={value} icon={icon} emptyLabel={emptyLabel} />
    </div>
  );
}

const BUSINESS_PILL_LABELS = {
  success: 'Aktywny',
  warning: 'Zawieszony',
  destructive: 'Wykreślony',
  muted: 'Brak danych',
} as const;

const FINANCE_PILL_LABELS = {
  success: 'Zweryfikowany',
  warning: 'Do weryfikacji',
  destructive: 'Ryzyko',
  muted: 'Brak danych',
} as const;

function applyProfileBusinessData(
  data: ProfileBusinessData,
  setters: {
    setAccountRole: (value: string | null) => void;
    setOrganizationType: (value: string | null) => void;
    setCompanyType: (value: string | null) => void;
    setCompanyName: (value: string) => void;
    setCompanyNip: (value: string) => void;
    setCompanyRegon: (value: string) => void;
    setCompanyKrs: (value: string) => void;
    setLegalForm: (value: string) => void;
    setCompanyAddress: (value: string) => void;
    setCompanyCity: (value: string) => void;
    setCompanyPostalCode: (value: string) => void;
    setBankAccountIban: (value: string) => void;
    setVatStatus: (value: string) => void;
    setVatWhitelistAssigned: (value: boolean | null) => void;
    setRegistrySnapshot: (value: CompanyRegistrySnapshot | null) => void;
  },
): void {
  setters.setAccountRole(data.accountRole);
  setters.setOrganizationType(data.organizationType);
  setters.setCompanyType(data.companyType);
  setters.setCompanyName(data.companyName);
  setters.setCompanyNip(data.companyNip);
  setters.setCompanyRegon(data.companyRegon);
  setters.setCompanyKrs(data.companyKrs);
  setters.setLegalForm(data.legalForm);
  setters.setCompanyAddress(data.companyAddress);
  setters.setCompanyCity(data.companyCity);
  setters.setCompanyPostalCode(data.companyPostalCode);
  setters.setBankAccountIban(data.bankAccountIban);
  setters.setVatStatus(data.vatStatus);
  setters.setVatWhitelistAssigned(data.vatWhitelistAssigned);
  setters.setRegistrySnapshot(data.registrySnapshot);
}

export function ProfileForm({ user, includeBusinessData }: ProfileFormProps) {
  const { refreshSession } = useUserProfile();
  const showBusinessData =
    Boolean(includeBusinessData) || user.userType === 'manager';
  const isContractor = user.userType === 'contractor';
  const cachedBusinessData = getProfileBusinessDataCache(user.id);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  const [isLoadingBusiness, setIsLoadingBusiness] = useState(
    showBusinessData && !cachedBusinessData,
  );
  const [companyName, setCompanyName] = useState(cachedBusinessData?.companyName ?? '');
  const [companyNip, setCompanyNip] = useState(cachedBusinessData?.companyNip ?? '');
  const [companyRegon, setCompanyRegon] = useState(cachedBusinessData?.companyRegon ?? '');
  const [companyKrs, setCompanyKrs] = useState(cachedBusinessData?.companyKrs ?? '');
  const [legalForm, setLegalForm] = useState(cachedBusinessData?.legalForm ?? '');
  const [companyAddress, setCompanyAddress] = useState(cachedBusinessData?.companyAddress ?? '');
  const [companyCity, setCompanyCity] = useState(cachedBusinessData?.companyCity ?? '');
  const [companyPostalCode, setCompanyPostalCode] = useState(cachedBusinessData?.companyPostalCode ?? '');
  const [bankAccountIban, setBankAccountIban] = useState(cachedBusinessData?.bankAccountIban ?? '');
  const [vatStatus, setVatStatus] = useState(cachedBusinessData?.vatStatus ?? '');
  const [vatWhitelistAssigned, setVatWhitelistAssigned] = useState<boolean | null>(
    cachedBusinessData?.vatWhitelistAssigned ?? null,
  );
  const [registrySnapshot, setRegistrySnapshot] = useState<CompanyRegistrySnapshot | null>(
    cachedBusinessData?.registrySnapshot ?? null,
  );
  const [companyType, setCompanyType] = useState<string | null>(cachedBusinessData?.companyType ?? null);
  const [accountRole, setAccountRole] = useState<string | null>(cachedBusinessData?.accountRole ?? null);
  const [organizationType, setOrganizationType] = useState<string | null>(
    cachedBusinessData?.organizationType ?? null,
  );

  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? '');
    setPhoneTouched(false);
  }, [user.firstName, user.lastName, user.phone]);

  const phoneError = (() => {
    if (!phoneTouched) {
      return null;
    }
    if (!phone.trim()) {
      return 'Telefon jest wymagany';
    }
    if (!isValidPolishPhone(phone)) {
      return POLISH_PHONE_INVALID_MESSAGE;
    }
    return null;
  })();

  const isPersonalDirty =
    firstName.trim() !== user.firstName.trim() ||
    lastName.trim() !== user.lastName.trim() ||
    phone.trim() !== (user.phone ?? '').trim();

  const handleSavePersonal = async (): Promise<void> => {
    setPhoneTouched(true);

    if (!firstName.trim()) {
      toast.error('Imię jest wymagane');
      return;
    }
    if (!lastName.trim()) {
      toast.error('Nazwisko jest wymagane');
      return;
    }
    if (!phone.trim()) {
      toast.error('Telefon jest wymagany');
      return;
    }
    if (!isValidPolishPhone(phone)) {
      toast.error(POLISH_PHONE_INVALID_MESSAGE);
      return;
    }

    setIsSavingPersonal(true);
    try {
      const result = await updateUserAction({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });

      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }

      await refreshSession();
      toast.success('Dane osobowe zostały zapisane');
    } catch {
      toast.error('Nie udało się zapisać danych');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const businessDataSetters = useMemo(
    () => ({
      setAccountRole,
      setOrganizationType,
      setCompanyType,
      setCompanyName,
      setCompanyNip,
      setCompanyRegon,
      setCompanyKrs,
      setLegalForm,
      setCompanyAddress,
      setCompanyCity,
      setCompanyPostalCode,
      setBankAccountIban,
      setVatStatus,
      setVatWhitelistAssigned,
      setRegistrySnapshot,
    }),
    [],
  );

  const loadFinanceSettings = useCallback(async () => {
    const finance = await getUserFinanceSettingsAction();

    if ('error' in finance) {
      console.error('ProfileForm finance load failed:', finance.error);
      return null;
    }

    let { bankAccountIban: iban, vatStatus: vat, vatWhitelistAccountAssigned } = finance.data;

    if (!iban || !vat) {
      const financeSync = await ensureUserFinanceFromCompanyNipAction();
      if ('data' in financeSync) {
        iban = financeSync.data.bankAccountIban ?? iban;
        vat = financeSync.data.vatStatus ?? vat;
        vatWhitelistAccountAssigned =
          financeSync.data.vatWhitelistAccountAssigned ?? vatWhitelistAccountAssigned;
      }
    }

    return {
      bankAccountIban: iban ?? '',
      vatStatus: vat ?? '',
      vatWhitelistAssigned: vatWhitelistAccountAssigned ?? null,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchProfileBusinessData = async (): Promise<ProfileBusinessData | null> => {
      const supabase = createClient();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('account_role, organization_type')
        .eq('id', user.id)
        .maybeSingle();

      const nextData: ProfileBusinessData = {
        accountRole: profile?.account_role ?? null,
        organizationType: profile?.organization_type ?? null,
        companyType: null,
        companyName: '',
        companyNip: '',
        companyRegon: '',
        companyKrs: '',
        legalForm: '',
        companyAddress: '',
        companyCity: '',
        companyPostalCode: '',
        bankAccountIban: '',
        vatStatus: '',
        vatWhitelistAssigned: null,
        registrySnapshot: null,
      };

      if (!showBusinessData) {
        return nextData;
      }

      if (isContractor) {
        let snapshot = await getCompanyRegistrySnapshotAction();
        if (!snapshot) {
          const registryResult = await verifyCompanyRegistryAction();
          if (registryResult.ok) {
            snapshot = registryResult.snapshot;
          }
        }
        nextData.registrySnapshot = snapshot;
      }

      const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);

      nextData.companyType = company?.type ?? null;
      nextData.companyName = company?.name || '';
      nextData.companyNip = (company?.nip || '').trim();
      nextData.companyRegon = (company?.regon || '').trim();
      nextData.companyKrs = (company?.krs || '').trim();
      nextData.legalForm = company?.legal_form || '';
      nextData.companyAddress = company?.address || '';
      nextData.companyCity = company?.city || '';
      nextData.companyPostalCode = company?.postal_code || '';

      const finance = await loadFinanceSettings();

      if (finance) {
        nextData.bankAccountIban = finance.bankAccountIban;
        nextData.vatStatus = finance.vatStatus;
        nextData.vatWhitelistAssigned = finance.vatWhitelistAssigned;
      }

      if (!isContractor && company) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data: settings } = await sb
          .from('contractor_account_settings')
          .select(
            'vat_status, vat_whitelist_account_assigned, finance_registry_status, finance_registry_checked_at',
          )
          .eq('user_id', user.id)
          .maybeSingle();

        nextData.registrySnapshot = buildCompanyRegistrySnapshot(company, {
          vat_status: finance?.vatStatus ?? settings?.vat_status,
          vat_whitelist_account_assigned:
            finance?.vatWhitelistAssigned ?? settings?.vat_whitelist_account_assigned,
          finance_registry_status: settings?.finance_registry_status,
          finance_registry_checked_at: settings?.finance_registry_checked_at,
        });
      } else if (company && finance && !nextData.registrySnapshot) {
        nextData.registrySnapshot = buildCompanyRegistrySnapshot(company, {
          vat_status: finance.vatStatus,
          vat_whitelist_account_assigned: finance.vatWhitelistAssigned,
        });
      }

      return nextData;
    };

    const loadProfileContext = async () => {
      const cached = getProfileBusinessDataCache(user.id);
      if (cached) {
        applyProfileBusinessData(cached, businessDataSetters);
        setIsLoadingBusiness(false);
        if (isProfileBusinessDataCacheFresh(user.id)) {
          return;
        }
      } else if (showBusinessData) {
        setIsLoadingBusiness(true);
      }

      try {
        const data = await fetchProfileBusinessData();
        if (cancelled || !data) {
          return;
        }

        applyProfileBusinessData(data, businessDataSetters);
        if (showBusinessData) {
          setProfileBusinessDataCache(user.id, data);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBusiness(false);
        }
      }
    };

    void loadProfileContext();

    return () => {
      cancelled = true;
    };
  }, [businessDataSetters, isContractor, loadFinanceSettings, showBusinessData, user.id]);

  const vatLabel =
    VAT_STATUS_OPTIONS.find(option => option.value === vatStatus)?.label ??
    (vatStatus || '—');

  const sectionLabels = getProfileSectionLabels({
    userType: user.userType,
    accountRole,
    companyType,
    organizationType,
  });

  const registryState = useMemo(
    () =>
      registrySnapshot
        ? resolveRegistryVerificationState(registrySnapshot)
        : null,
    [registrySnapshot],
  );

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-card">
        <h4 className="font-medium mb-4">{sectionLabels.contact}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-first-name">Imię</Label>
            <Input
              id="profile-first-name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-last-name">Nazwisko</Label>
            <Input
              id="profile-last-name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
          <ReadOnlyField
            label="Adres email"
            value={user.email}
            icon={<Mail className="h-4 w-4 shrink-0 text-muted-foreground" />}
          />
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Telefon</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => setPhoneTouched(true)}
                placeholder="+48 123 456 789"
                className="pl-9"
                autoComplete="tel"
              />
            </div>
            {phoneError ? <p className="text-sm text-destructive">{phoneError}</p> : null}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSavePersonal()}
            disabled={isSavingPersonal || !isPersonalDirty}
          >
            {isSavingPersonal ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Zapisywanie…
              </>
            ) : (
              'Zapisz zmiany'
            )}
          </Button>
        </div>
      </div>

      {showBusinessData ? (
        <div className="border rounded-lg p-4 bg-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              {sectionLabels.business}
            </h4>
            {registryState ? (
              <RegistryStatusPill
                label={BUSINESS_PILL_LABELS[registryState.businessPill]}
                variant={registryState.businessPill}
                tooltip={BUSINESS_STATUS_TOOLTIPS[registryState.businessPill]}
                checkedAt={registrySnapshot?.registryCheckedAt}
              />
            ) : null}
          </div>

          {isLoadingBusiness ? (
            <p className="text-sm text-muted-foreground">Ładowanie danych firmy…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField label="Nazwa firmy" value={companyName} />
              <ReadOnlyField label="Typ podmiotu" value={legalForm} emptyLabel="Nie podano" />
              <ReadOnlyField label="NIP" value={companyNip} />
              <ReadOnlyField label="REGON" value={companyRegon} />
              <ReadOnlyField label="KRS" value={companyKrs} emptyLabel="Nie dotyczy" />
              <ReadOnlyField label="Adres" value={companyAddress} emptyLabel="Nie podano" />
              <ReadOnlyField label="Miasto" value={companyCity} emptyLabel="Nie podano" />
              <ReadOnlyField label="Kod pocztowy" value={companyPostalCode} emptyLabel="Nie podano" />

              <div className="sm:col-span-2 border-t pt-4 mt-1">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Banknote className="h-4 w-4" aria-hidden />
                    Rozliczenia i finanse
                  </h5>
                  {registryState ? (
                    <RegistryStatusPill
                      label={FINANCE_PILL_LABELS[registryState.financePill]}
                      variant={registryState.financePill}
                      tooltip={FINANCE_STATUS_TOOLTIPS[registryState.financePill]}
                      checkedAt={registrySnapshot?.financeRegistryCheckedAt}
                    />
                  ) : null}
                </div>
              </div>
              <ReadOnlyField
                label="Numer konta bankowego (IBAN)"
                value={bankAccountIban ? formatIbanDisplay(bankAccountIban) : ''}
                emptyLabel="Nie podano"
              />
              <ReadOnlyField
                label="Status podatnika VAT"
                value={vatLabel}
                emptyLabel="Nie podano"
              />
            </div>
          )}
        </div>
      ) : null}

      {isContractor && includeBusinessData ? (
        <ContractorServiceAreaSettings userId={user.id} />
      ) : null}
    </div>
  );
}
