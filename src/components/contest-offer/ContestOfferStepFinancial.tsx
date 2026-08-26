'use client';

import { type ReactElement } from 'react';
import type { FileRejection } from 'react-dropzone';
import { toast } from 'sonner';
import { Banknote, FileText, Receipt, Shield, Upload, X } from 'lucide-react';
import type { ContestInfo } from '../../types/job';
import type { ContestOfferFormData } from '../../types/contest-offer';
import type { ContestOfferFieldErrors } from '../../lib/contest-offer/offer-form-validation';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import { cn } from '../ui/utils';
import {
  formatMonthsLabel,
  warrantyMonthsOptions,
} from '../../lib/contest-offer/warranty-period-options';
import {
  OFFER_DEPOSIT_ACCEPT,
  OFFER_DOCUMENT_MAX_BYTES,
  contestOfferDocumentRejectionMessage,
  formatContestFileSize,
} from '../../lib/contest-offer/contest-offer-form-documents';
import {
  contestOfferFileIconWrapClass,
  contestOfferSectionCardClass,
  contestOfferSectionIconClass,
  contestOfferStagedFileRowClass,
  contestOfferUploadedFileRowClass,
} from './ContestOfferFormalDocBlock';
import {
  ContestOfferFieldError,
  ContestOfferRequiredLabel,
  fieldErrorInputClass,
} from './ContestOfferFieldError';

interface ContestOfferStepFinancialProps {
  form: ContestOfferFormData;
  contestInfo: ContestInfo;
  grossDisplay: string;
  fieldErrors: ContestOfferFieldErrors;
  onPatch: (patch: Partial<ContestOfferFormData>) => void;
  onStageDeposit: (file: File) => void;
  onRemoveDeposit: () => void;
  onFileIssue?: (message: string | null) => void;
}

export function ContestOfferStepFinancial({
  form,
  contestInfo,
  grossDisplay,
  fieldErrors,
  onPatch,
  onStageDeposit,
  onRemoveDeposit,
  onFileIssue,
}: ContestOfferStepFinancialProps): ReactElement {
  const warrantyOptions = warrantyMonthsOptions(contestInfo.warrantyPeriod);
  const guaranteeOptions = warrantyMonthsOptions(contestInfo.guaranteePeriod);
  const showCustomPayment =
    contestInfo.paymentTerms.mode === 'custom' &&
    (contestInfo.paymentTerms.customDays ?? 0) > 14;
  const depositAttachment = form.extraAttachments.find((a) => a.requirementKey === 'deposit');
  const stagedDeposit = form.stagedFiles.deposit?.[0];
  const depositDisplayName = stagedDeposit?.name ?? depositAttachment?.name;
  const hasDepositFile = Boolean(depositDisplayName);
  const isDepositStaged = Boolean(stagedDeposit);

  const hasPricingError = Boolean(fieldErrors.netPrice);
  const hasWarrantyError = Boolean(fieldErrors.warrantyMonths || fieldErrors.guaranteeMonths);
  const depositSize = stagedDeposit?.size ?? depositAttachment?.size;

  const handleDepositDrop = (accepted: File[], rejections: FileRejection[]): void => {
    if (rejections.length > 0) {
      const firstRejection = rejections[0];
      const message = firstRejection
        ? contestOfferDocumentRejectionMessage(firstRejection, 'deposit')
        : 'Nieprawidłowy plik';
      toast.error(message);
      onFileIssue?.(message);
    }

    const file = accepted[0];
    if (file) {
      onStageDeposit(file);
      if (rejections.length === 0) {
        onFileIssue?.(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <section
        className={cn(contestOfferSectionCardClass, hasPricingError && 'border-destructive')}
      >
        <div className="flex items-start gap-3">
          <div className={contestOfferSectionIconClass} aria-hidden>
            <Banknote className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <ContestOfferRequiredLabel>Wycena oferty</ContestOfferRequiredLabel>
            <p className="mt-1 text-sm text-muted-foreground">
              Podaj cenę netto za całość prac oraz stawkę VAT obowiązującą w Twojej ofercie.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="contest-offer-netPrice"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Cena netto (zł)
                </label>
                <Input
                  id="contest-offer-netPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.netPrice}
                  onChange={(e) => onPatch({ netPrice: e.target.value })}
                  className={cn(
                    'mt-1.5 border-border/60 bg-white dark:bg-card',
                    fieldErrorInputClass(Boolean(fieldErrors.netPrice)),
                  )}
                  aria-invalid={Boolean(fieldErrors.netPrice)}
                />
                <ContestOfferFieldError message={fieldErrors.netPrice} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Stawka VAT</span>
                <Select
                  value={form.vatRate}
                  onValueChange={(v) =>
                    onPatch({ vatRate: v as ContestOfferFormData['vatRate'] })
                  }
                >
                  <SelectTrigger className="mt-1.5 border-border/60 bg-white dark:bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8%</SelectItem>
                    <SelectItem value="23">23%</SelectItem>
                    <SelectItem value="zw">zw.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 inline-flex min-w-[10rem] flex-col rounded-md border border-border/50 bg-muted/20 px-3 py-2">
              <span className="text-xs text-muted-foreground">Cena brutto (obliczona)</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {grossDisplay === '—' ? '—' : `${grossDisplay} zł`}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={cn(contestOfferSectionCardClass, hasWarrantyError && 'border-destructive')}
      >
        <div className="flex items-start gap-3">
          <div className={contestOfferSectionIconClass} aria-hidden>
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <ContestOfferRequiredLabel>Gwarancja i rękojmia</ContestOfferRequiredLabel>
            <p className="mt-1 text-sm text-muted-foreground">
              Wybierz okresy gwarancji i rękojmi oferowane w ramach tej oferty.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Oferowany okres gwarancji
                </span>
                <Select
                  value={form.warrantyMonths}
                  onValueChange={(v) => onPatch({ warrantyMonths: v })}
                >
                  <SelectTrigger
                    id="contest-offer-warrantyMonths"
                    className={cn(
                      'mt-1.5 border-border/60 bg-white dark:bg-card',
                      fieldErrorInputClass(Boolean(fieldErrors.warrantyMonths)),
                    )}
                    aria-invalid={Boolean(fieldErrors.warrantyMonths)}
                  >
                    <SelectValue placeholder="Wybierz" />
                  </SelectTrigger>
                  <SelectContent>
                    {warrantyOptions.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {formatMonthsLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ContestOfferFieldError message={fieldErrors.warrantyMonths} />
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Oferowany okres rękojmi
                </span>
                <Select
                  value={form.guaranteeMonths}
                  onValueChange={(v) => onPatch({ guaranteeMonths: v })}
                >
                  <SelectTrigger
                    id="contest-offer-guaranteeMonths"
                    className={cn(
                      'mt-1.5 border-border/60 bg-white dark:bg-card',
                      fieldErrorInputClass(Boolean(fieldErrors.guaranteeMonths)),
                    )}
                    aria-invalid={Boolean(fieldErrors.guaranteeMonths)}
                  >
                    <SelectValue placeholder="Wybierz" />
                  </SelectTrigger>
                  <SelectContent>
                    {guaranteeOptions.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {formatMonthsLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ContestOfferFieldError message={fieldErrors.guaranteeMonths} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {contestInfo.depositRequired ? (
        <section
          className={cn(contestOfferSectionCardClass, fieldErrors.deposit && 'border-destructive')}
          id="contest-offer-deposit"
        >
          <div className="flex items-start gap-3">
            <div className={contestOfferSectionIconClass} aria-hidden>
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <ContestOfferRequiredLabel>Potwierdzenie przelewu wadium</ContestOfferRequiredLabel>
              <p className="mt-1 text-sm text-muted-foreground">
                Dołącz skan lub zdjęcie potwierdzenia wpłaty wadium wymaganego w konkursie.
              </p>
              {contestInfo.depositAmount != null ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Wymagane wadium:{' '}
                  <span className="font-semibold text-foreground">
                    {contestInfo.depositAmount.toLocaleString('pl-PL')} zł
                  </span>
                </p>
              ) : null}
              <div className="mt-3">
                <Dropzone
                  accept={OFFER_DEPOSIT_ACCEPT}
                  maxFiles={1}
                  minSize={1}
                  maxSize={OFFER_DOCUMENT_MAX_BYTES}
                  onDrop={handleDepositDrop}
                  className={cn('min-h-[120px] border-dashed', fieldErrors.deposit && 'border-destructive')}
                >
                  <DropzoneEmptyState>
                    <p className="text-sm font-medium">
                      {hasDepositFile
                        ? 'Zastąp plik — przeciągnij lub kliknij'
                        : 'Przeciągnij plik tutaj lub kliknij, aby wybrać'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF lub obraz — max 10&nbsp;MB
                    </p>
                  </DropzoneEmptyState>
                  <DropzoneContent />
                </Dropzone>
              </div>
              <ContestOfferFieldError message={fieldErrors.deposit} />
              {hasDepositFile ? (
                <ul className="mt-3 space-y-2">
                  <li
                    className={
                      isDepositStaged ? contestOfferStagedFileRowClass : contestOfferUploadedFileRowClass
                    }
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={contestOfferFileIconWrapClass} aria-hidden>
                        {isDepositStaged ? (
                          <Upload className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">
                          {depositDisplayName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isDepositStaged
                            ? depositSize != null && depositSize > 0
                              ? `${formatContestFileSize(depositSize)} — nowy plik, zostanie wysłany przy zapisie`
                              : 'Nowy plik — zostanie wysłany przy zapisie'
                            : depositSize != null && depositSize > 0
                              ? `${formatContestFileSize(depositSize)} — dołączony do oferty`
                              : 'Dołączony do oferty'}
                        </span>
                      </span>
                    </span>
                    {onRemoveDeposit ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Usuń ${depositDisplayName}`}
                        onClick={onRemoveDeposit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </li>
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {showCustomPayment ? (
        <section
          className={cn(
            contestOfferSectionCardClass,
            fieldErrors.paymentTermsAccepted && 'border-destructive',
          )}
        >
          <div className="flex items-start gap-3">
            <div className={contestOfferSectionIconClass} aria-hidden>
              <Banknote className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <ContestOfferRequiredLabel htmlFor="contest-offer-paymentTermsAccepted">
                Termin płatności
              </ContestOfferRequiredLabel>
              <p className="mt-1 text-sm text-muted-foreground">
                Zarządca wymaga terminu płatności faktury wynoszącego{' '}
                <span className="font-medium text-foreground">
                  {contestInfo.paymentTerms.customDays} dni
                </span>
                .
              </p>
              <label
                htmlFor="contest-offer-paymentTermsAccepted"
                className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-border/50 bg-muted/20 px-3 py-2.5"
              >
                <Checkbox
                  id="contest-offer-paymentTermsAccepted"
                  checked={form.paymentTermsAccepted}
                  onCheckedChange={(v) => onPatch({ paymentTermsAccepted: v === true })}
                  aria-invalid={Boolean(fieldErrors.paymentTermsAccepted)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug text-foreground">
                  Akceptuję wymagany przez zarządcę termin płatności faktury.
                </span>
              </label>
              <ContestOfferFieldError message={fieldErrors.paymentTermsAccepted} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
