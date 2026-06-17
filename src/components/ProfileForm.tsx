'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Phone, Building2, Banknote, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Label } from './ui/label';
import { createClient } from '../lib/supabase/client';
import { fetchUserPrimaryCompany } from '../lib/database/companies';
import { getContractorAccountSettings } from '../lib/database/contractor-account';
import { VAT_STATUS_OPTIONS } from '../lib/contractor/constants';
import { formatIbanDisplay } from '../lib/contractor/iban';
import type { AuthUser } from '../types/auth';
import { ContractorServiceAreaSettings } from './ContractorServiceAreaSettings';
import { cn } from './ui/utils';

interface ProfileFormProps {
  user: AuthUser;
  /** Show company and finance data (contractors on „Twoje dane”, managers on „Profil”). */
  includeBusinessData?: boolean;
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
  wspólnota: 'Wspólnota Mieszkaniowa',
  spółdzielnia: 'Spółdzielnia Mieszkaniowa',
  contractor: 'Firma Wykonawcza',
  property_management: 'Zarząd Nieruchomości',
  condo_management: 'Zarząd Wspólnoty',
  housing_association: 'Stowarzyszenie Mieszkaniowe',
  cooperative: 'Spółdzielnia',
  construction_company: 'Firma Budowlana',
  service_provider: 'Usługodawca',
};

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
  const showBusinessData =
    Boolean(includeBusinessData) || user.userType === 'manager';
  const isContractor = user.userType === 'contractor';

  const [isLoadingBusiness, setIsLoadingBusiness] = useState(showBusinessData);
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyNip, setCompanyNip] = useState('');
  const [companyRegon, setCompanyRegon] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [bankAccountIban, setBankAccountIban] = useState('');
  const [vatStatus, setVatStatus] = useState('');
  const [vatWhitelistAssigned, setVatWhitelistAssigned] = useState<boolean | null>(null);
  const [vatWhitelistCheckedForDate, setVatWhitelistCheckedForDate] = useState<string | null>(null);

  const loadBusinessData = useCallback(async () => {
    if (!showBusinessData) {
      return;
    }

    setIsLoadingBusiness(true);
    try {
      const supabase = createClient();
      const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);

      setCompanyName(company?.name || '');
      setCompanyType(company?.type || '');
      setCompanyNip((company?.nip || '').trim());
      setCompanyRegon((company?.regon || '').trim());
      setCompanyAddress(company?.address || '');
      setCompanyCity(company?.city || '');
      setCompanyPostalCode(company?.postal_code || '');

      if (isContractor) {
        const settings = await getContractorAccountSettings(user.id);
        setBankAccountIban(settings.bankAccountIban ?? '');
        setVatStatus(settings.vatStatus ?? '');
        setVatWhitelistAssigned(settings.vatWhitelistAccountAssigned);
        setVatWhitelistCheckedForDate(settings.vatWhitelistCheckedForDate);
      }
    } finally {
      setIsLoadingBusiness(false);
    }
  }, [isContractor, showBusinessData, user.id]);

  useEffect(() => {
    void loadBusinessData();
  }, [loadBusinessData]);

  const vatLabel =
    VAT_STATUS_OPTIONS.find(option => option.value === vatStatus)?.label ?? '—';

  const companyTypeLabel = COMPANY_TYPE_LABELS[companyType] || companyType || '—';

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-card">
        <h4 className="font-medium mb-4">Dane osobowe i kontaktowe</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Imię" value={user.firstName} />
          <ReadOnlyField label="Nazwisko" value={user.lastName} />
          <ReadOnlyField
            label="Adres email"
            value={user.email}
            icon={<Mail className="h-4 w-4 shrink-0 text-muted-foreground" />}
          />
          <ReadOnlyField
            label="Telefon"
            value={user.phone}
            icon={<Phone className="h-4 w-4 shrink-0 text-muted-foreground" />}
            emptyLabel="Nie podano"
          />
        </div>
      </div>

      {showBusinessData ? (
        <div className="border rounded-lg p-4 bg-card">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            {isContractor ? 'Dane biznesowe i finanse' : 'Dane biznesowe'}
          </h4>

          {isLoadingBusiness ? (
            <p className="text-sm text-muted-foreground">Ładowanie danych firmy…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField label="Nazwa firmy" value={companyName} />
              <ReadOnlyField label="NIP" value={companyNip} />
              <ReadOnlyField label="REGON" value={companyRegon} />
              {!isContractor ? (
                <ReadOnlyField label="Typ organizacji" value={companyTypeLabel} />
              ) : null}
              <ReadOnlyField label="Adres" value={companyAddress} emptyLabel="Nie podano" />
              <ReadOnlyField label="Miasto" value={companyCity} emptyLabel="Nie podano" />
              <ReadOnlyField label="Kod pocztowy" value={companyPostalCode} emptyLabel="Nie podano" />

              {isContractor ? (
                <>
                  <div className="sm:col-span-2 border-t pt-4 mt-1">
                    <h5 className="text-sm font-medium mb-4 flex items-center gap-2 text-muted-foreground">
                      <Banknote className="h-4 w-4" aria-hidden />
                      Rozliczenia i finanse
                    </h5>
                  </div>
                  <ReadOnlyField
                    label="Numer konta bankowego (IBAN)"
                    value={bankAccountIban ? formatIbanDisplay(bankAccountIban) : ''}
                  />
                  <ReadOnlyField label="Status podatnika VAT" value={vatLabel} />
                  <FinanceWhitelistStatus
                    assigned={vatWhitelistAssigned}
                    checkedForDate={vatWhitelistCheckedForDate}
                  />
                </>
              ) : null}
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
