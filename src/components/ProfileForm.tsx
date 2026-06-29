'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, Building2, Banknote, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
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

function FinanceWhitelistStatus({
  assigned,
  checkedForDate,
}: {
  assigned: boolean | null;
  checkedForDate: string | null;
}) {
  if (assigned === null) {
    return null;
  }

  const message = assigned
    ? 'Rachunek jest przypisany do NIP firmy na białej liście VAT'
    : 'Rachunek nie jest przypisany do NIP firmy na białej liście VAT';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs sm:col-span-2',
        assigned
          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700'
          : 'border-amber-500/30 bg-amber-500/5 text-amber-800',
      )}
    >
      {assigned ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="space-y-1">
        <p>{message}</p>
        {checkedForDate ? (
          <p className="text-muted-foreground">Data weryfikacji w wykazie MF: {checkedForDate}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileForm({ user, includeBusinessData }: ProfileFormProps) {
  const { refreshSession } = useUserProfile();
  const showBusinessData =
    Boolean(includeBusinessData) || user.userType === 'manager';
  const isContractor = user.userType === 'contractor';

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  const [isLoadingBusiness, setIsLoadingBusiness] = useState(showBusinessData);
  const [companyName, setCompanyName] = useState('');
  const [companyNip, setCompanyNip] = useState('');
  const [companyRegon, setCompanyRegon] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [bankAccountIban, setBankAccountIban] = useState('');
  const [vatStatus, setVatStatus] = useState('');
  const [vatWhitelistAssigned, setVatWhitelistAssigned] = useState<boolean | null>(null);
  const [vatWhitelistCheckedForDate, setVatWhitelistCheckedForDate] = useState<string | null>(null);
  const [companyType, setCompanyType] = useState<string | null>(null);
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [organizationType, setOrganizationType] = useState<string | null>(null);

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

  const loadFinanceSettings = useCallback(async () => {
    const finance = await getUserFinanceSettingsAction();

    if ('error' in finance) {
      console.error('ProfileForm finance load failed:', finance.error);
      return;
    }

    let { bankAccountIban: iban, vatStatus: vat, vatWhitelistAccountAssigned, vatWhitelistCheckedForDate } =
      finance.data;

    if (!iban || !vat) {
      const financeSync = await ensureUserFinanceFromCompanyNipAction();
      if ('data' in financeSync) {
        iban = financeSync.data.bankAccountIban ?? iban;
        vat = financeSync.data.vatStatus ?? vat;
        vatWhitelistAccountAssigned =
          financeSync.data.vatWhitelistAccountAssigned ?? vatWhitelistAccountAssigned;
        vatWhitelistCheckedForDate =
          financeSync.data.vatWhitelistCheckedForDate ?? vatWhitelistCheckedForDate;
      }
    }

    setBankAccountIban(iban ?? '');
    setVatStatus(vat ?? '');
    setVatWhitelistAssigned(vatWhitelistAccountAssigned);
    setVatWhitelistCheckedForDate(vatWhitelistCheckedForDate);
  }, []);

  const loadProfileContext = useCallback(async () => {
    const supabase = createClient();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('account_role, organization_type')
      .eq('id', user.id)
      .maybeSingle();

    setAccountRole(profile?.account_role ?? null);
    setOrganizationType(profile?.organization_type ?? null);

    if (!showBusinessData) {
      return;
    }

    setIsLoadingBusiness(true);
    try {
      const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);

      setCompanyType(company?.type ?? null);
      setCompanyName(company?.name || '');
      setCompanyNip((company?.nip || '').trim());
      setCompanyRegon((company?.regon || '').trim());
      setCompanyAddress(company?.address || '');
      setCompanyCity(company?.city || '');
      setCompanyPostalCode(company?.postal_code || '');

      await loadFinanceSettings();
    } finally {
      setIsLoadingBusiness(false);
    }
  }, [loadFinanceSettings, showBusinessData, user.id]);

  useEffect(() => {
    void loadProfileContext();
  }, [loadProfileContext]);

  const vatLabel =
    VAT_STATUS_OPTIONS.find(option => option.value === vatStatus)?.label ??
    (vatStatus || '—');

  const sectionLabels = getProfileSectionLabels({
    userType: user.userType,
    accountRole,
    companyType,
    organizationType,
  });

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
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            {sectionLabels.business}
          </h4>

          {isLoadingBusiness ? (
            <p className="text-sm text-muted-foreground">Ładowanie danych firmy…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField label="Nazwa firmy" value={companyName} />
              <ReadOnlyField label="NIP" value={companyNip} />
              <ReadOnlyField label="REGON" value={companyRegon} />
              <ReadOnlyField label="Adres" value={companyAddress} emptyLabel="Nie podano" />
              <ReadOnlyField label="Miasto" value={companyCity} emptyLabel="Nie podano" />
              <ReadOnlyField label="Kod pocztowy" value={companyPostalCode} emptyLabel="Nie podano" />

              <div className="sm:col-span-2 border-t pt-4 mt-1">
                <h5 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" aria-hidden />
                  Rozliczenia i finanse
                </h5>
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
              <FinanceWhitelistStatus
                assigned={vatWhitelistAssigned}
                checkedForDate={vatWhitelistCheckedForDate}
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
