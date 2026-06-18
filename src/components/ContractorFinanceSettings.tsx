'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, CheckCircle2, Edit2, Loader2, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getContractorAccountSettings,
  upsertContractorAccountSettings,
} from '../lib/database/contractor-account';
import { VAT_STATUS_OPTIONS } from '../lib/contractor/constants';
import { formatIbanDisplay, isValidPolishIban, normalizeIbanInput } from '../lib/contractor/iban';
import { verifyContractorBankAccountAction } from '../lib/mf-vat-whitelist/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { cn } from './ui/utils';

interface ContractorFinanceSettingsProps {
  userId: string;
}

type WhitelistUiStatus = 'idle' | 'loading' | 'assigned' | 'not_assigned' | 'error';

export function ContractorFinanceSettings({ userId }: ContractorFinanceSettingsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [iban, setIban] = useState('');
  const [vatStatus, setVatStatus] = useState<string>('');
  const [savedIban, setSavedIban] = useState('');
  const [savedVatStatus, setSavedVatStatus] = useState<string>('');
  const [savedWhitelistAssigned, setSavedWhitelistAssigned] = useState<boolean | null>(null);
  const [savedWhitelistCheckedForDate, setSavedWhitelistCheckedForDate] = useState<string | null>(null);
  const [savedWhitelistRequestId, setSavedWhitelistRequestId] = useState<string | null>(null);
  const [whitelistStatus, setWhitelistStatus] = useState<WhitelistUiStatus>('idle');
  const [whitelistMessage, setWhitelistMessage] = useState<string | null>(null);
  const lastVerifiedIbanRef = useRef<string | null>(null);
  const verifyAbortRef = useRef(0);

  const applyWhitelistResult = useCallback(
    (normalizedIban: string, assigned: boolean, checkedForDate: string, requestId: string | null) => {
      lastVerifiedIbanRef.current = normalizedIban;
      setSavedWhitelistAssigned(assigned);
      setSavedWhitelistCheckedForDate(checkedForDate);
      setSavedWhitelistRequestId(requestId);
      setWhitelistStatus(assigned ? 'assigned' : 'not_assigned');
      setWhitelistMessage(
        assigned
          ? 'Rachunek jest przypisany do NIP firmy na białej liście VAT'
          : 'Rachunek nie jest przypisany do NIP firmy na białej liście VAT',
      );
    },
    [],
  );

  const runWhitelistVerification = useCallback(
    async (ibanValue: string, options?: { silent?: boolean }) => {
      const normalized = normalizeIbanInput(ibanValue);
      if (!normalized || !isValidPolishIban(normalized)) {
        return;
      }

      if (lastVerifiedIbanRef.current === normalized) {
        return;
      }

      const requestId = ++verifyAbortRef.current;
      setWhitelistStatus('loading');
      setWhitelistMessage(null);

      const result = await verifyContractorBankAccountAction(normalized);

      if (requestId !== verifyAbortRef.current) {
        return;
      }

      if ('error' in result) {
        setWhitelistStatus('error');
        setWhitelistMessage(result.error);
        if (!options?.silent) {
          toast.error(result.error);
        }
        return;
      }

      applyWhitelistResult(
        normalized,
        result.data.assigned,
        result.data.checkedForDate,
        result.data.requestId,
      );
    },
    [applyWhitelistResult],
  );

  React.useEffect(() => {
    const load = async () => {
      try {
        const settings = await getContractorAccountSettings(userId);
        const ibanValue = settings.bankAccountIban ?? '';
        const vatValue = settings.vatStatus ?? '';
        setIban(ibanValue);
        setVatStatus(vatValue);
        setSavedIban(ibanValue);
        setSavedVatStatus(vatValue);
        setSavedWhitelistAssigned(settings.vatWhitelistAccountAssigned);
        setSavedWhitelistCheckedForDate(settings.vatWhitelistCheckedForDate);
        setSavedWhitelistRequestId(settings.vatWhitelistRequestId);

        if (ibanValue && settings.vatWhitelistAccountAssigned !== null) {
          lastVerifiedIbanRef.current = ibanValue;
          setWhitelistStatus(settings.vatWhitelistAccountAssigned ? 'assigned' : 'not_assigned');
          setWhitelistMessage(
            settings.vatWhitelistAccountAssigned
              ? 'Rachunek jest przypisany do NIP firmy na białej liście VAT'
              : 'Rachunek nie jest przypisany do NIP firmy na białej liście VAT',
          );
        }
      } catch (error) {
        console.error('Error loading finance settings:', error);
        toast.error('Nie udało się załadować danych finansowych');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [userId]);

  const normalizedIban = normalizeIbanInput(iban);

  useEffect(() => {
    if (!isEditing || !isValidPolishIban(normalizedIban)) {
      return;
    }

    if (lastVerifiedIbanRef.current === normalizedIban) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runWhitelistVerification(normalizedIban, { silent: true });
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedIban, isEditing, runWhitelistVerification]);

  const handleSave = async () => {
    const normalized = normalizeIbanInput(iban);
    if (normalized && !isValidPolishIban(normalized)) {
      toast.error('Numer konta bankowego musi składać się z 26 cyfr');
      return;
    }

    try {
      setIsSaving(true);

      if (normalized) {
        await runWhitelistVerification(normalized, { silent: true });
      } else {
        lastVerifiedIbanRef.current = null;
        setWhitelistStatus('idle');
        setWhitelistMessage(null);
        setSavedWhitelistAssigned(null);
        setSavedWhitelistCheckedForDate(null);
        setSavedWhitelistRequestId(null);
      }

      await upsertContractorAccountSettings(userId, {
        bankAccountIban: normalized || null,
        vatStatus: vatStatus === 'active_vat' || vatStatus === 'vat_exempt' ? vatStatus : null,
        ...(normalized
          ? {}
          : {
              vatWhitelistVerifiedAt: null,
              vatWhitelistAccountAssigned: null,
              vatWhitelistRequestId: null,
              vatWhitelistCheckedForDate: null,
            }),
      });

      setSavedIban(normalized);
      setSavedVatStatus(vatStatus);
      setIban(normalized);
      setIsEditing(false);
      toast.success('Dane finansowe zostały zapisane');
      router.refresh();
    } catch (error) {
      console.error('Error saving finance settings:', error);
      toast.error('Nie udało się zapisać danych finansowych');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    verifyAbortRef.current += 1;
    setIban(savedIban);
    setVatStatus(savedVatStatus);
    setIsEditing(false);

    if (savedIban && savedWhitelistAssigned !== null) {
      lastVerifiedIbanRef.current = savedIban;
      setWhitelistStatus(savedWhitelistAssigned ? 'assigned' : 'not_assigned');
      setWhitelistMessage(
        savedWhitelistAssigned
          ? 'Rachunek jest przypisany do NIP firmy na białej liście VAT'
          : 'Rachunek nie jest przypisany do NIP firmy na białej liście VAT',
      );
    } else {
      lastVerifiedIbanRef.current = null;
      setWhitelistStatus('idle');
      setWhitelistMessage(null);
    }
  };

  const handleIbanChange = (value: string) => {
    const normalized = normalizeIbanInput(value);
    setIban(normalized);
    if (lastVerifiedIbanRef.current && lastVerifiedIbanRef.current !== normalized) {
      lastVerifiedIbanRef.current = null;
      setWhitelistStatus('idle');
      setWhitelistMessage(null);
    }
  };

  const vatLabel =
    VAT_STATUS_OPTIONS.find(o => o.value === savedVatStatus)?.label ?? '—';

  const displayWhitelistStatus = isEditing ? whitelistStatus : savedWhitelistAssigned !== null
    ? savedWhitelistAssigned
      ? 'assigned'
      : 'not_assigned'
    : 'idle';

  const displayWhitelistMessage = isEditing
    ? whitelistMessage
    : savedWhitelistAssigned !== null
      ? savedWhitelistAssigned
        ? 'Rachunek jest przypisany do NIP firmy na białej liście VAT'
        : 'Rachunek nie jest przypisany do NIP firmy na białej liście VAT'
      : null;

  const displayCheckedForDate = savedWhitelistCheckedForDate;

  return (
    <div className="border rounded-lg p-4 bg-card">
      <FinanceCardHeader
        isLoading={isLoading}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie danych finansowych…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="contractor-iban">Numer konta bankowego (IBAN)</Label>
            {isEditing ? (
              <>
                <div className="relative">
                  <Input
                    id="contractor-iban"
                    value={formatIbanDisplay(iban)}
                    onChange={e => handleIbanChange(e.target.value)}
                    inputMode="numeric"
                    placeholder="26 cyfr bez prefiksu PL"
                    maxLength={32}
                  />
                  {whitelistStatus === 'loading' && (
                    <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Po wpisaniu 26 cyfr konto zostanie automatycznie sprawdzone na białej liście VAT (MF).
                </p>
              </>
            ) : (
              <p className="text-sm py-2 px-3 bg-muted rounded-md">
                {savedIban ? formatIbanDisplay(savedIban) : '—'}
              </p>
            )}
            <WhitelistStatusMessage
              status={displayWhitelistStatus}
              message={displayWhitelistMessage}
              checkedForDate={displayCheckedForDate}
              requestId={savedWhitelistRequestId}
              showRequestId={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractor-vat-status">Status podatnika VAT</Label>
            {isEditing ? (
              <Select value={vatStatus || undefined} onValueChange={setVatStatus}>
                <SelectTrigger id="contractor-vat-status">
                  <SelectValue placeholder="Wybierz status VAT" />
                </SelectTrigger>
                <SelectContent>
                  {VAT_STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm py-2 px-3 bg-muted rounded-md">{vatLabel}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WhitelistStatusMessage({
  status,
  message,
  checkedForDate,
  requestId,
  showRequestId,
}: {
  status: WhitelistUiStatus;
  message: string | null;
  checkedForDate: string | null;
  requestId: string | null;
  showRequestId: boolean;
}) {
  if (status === 'idle' || !message) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
        status === 'assigned' && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700',
        status === 'not_assigned' && 'border-amber-500/30 bg-amber-500/5 text-amber-800',
        status === 'error' && 'border-destructive/30 bg-destructive/5 text-destructive',
        status === 'loading' && 'border-border/60 bg-muted/40 text-muted-foreground',
      )}
    >
      {status === 'assigned' ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="space-y-1">
        <p>{message}</p>
        {checkedForDate ? (
          <p className="text-muted-foreground">Data weryfikacji w wykazie MF: {checkedForDate}</p>
        ) : null}
        {showRequestId && requestId ? (
          <p className="text-muted-foreground">ID zapytania MF: {requestId}</p>
        ) : null}
      </div>
    </div>
  );
}

function FinanceCardHeader({
  isLoading,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: {
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h4 className="font-medium flex items-center gap-2">
        <Banknote className="h-4 w-4 text-muted-foreground" aria-hidden />
        Rozliczenia i finanse
      </h4>
      {isLoading ? (
        <span className="text-xs text-muted-foreground">Ładowanie…</span>
      ) : !isEditing ? (
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edytuj
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Anuluj
          </Button>
          <Button variant="default" size="sm" onClick={onSave} disabled={isSaving}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isSaving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      )}
    </div>
  );
}
