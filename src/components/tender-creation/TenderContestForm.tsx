'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { File, FileText, Loader2, Plus, Save, Send, Trash2, Upload, X } from 'lucide-react';
import type { FileRejection } from 'react-dropzone';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '../ui/dropzone';
import { useUserProfile } from '../../contexts/AuthContext';
import { createClient } from '../../lib/supabase/client';
import { fetchUserPrimaryCompany } from '../../lib/database/companies';
import { fetchAllCategoriesWithSubcategories } from '../../lib/database/categories';
import type { CategoryWithSubcategories } from '../../lib/database/categories';
import { fetchManagerHousingEntities } from '../../lib/database/managed-housing-entities';
import type { ManagedHousingEntity } from '../../types/managed-housing-entity';
import { formatManagedHousingEntitySelectLabel } from '../../types/managed-housing-entity';
import type {
  SelectionCriterionItem,
  TenderContestDocumentMeta,
  TenderContestFormData,
  WarrantyGuaranteePeriod,
} from '../../types/tender-contest';
import {
  createEmptyTenderContestForm,
  selectionCriteriaTotalWeight,
} from '../../types/tender-contest';
import {
  clearTenderContestFieldErrorsForPatch,
  getTenderContestFormFieldErrors,
  hasTenderContestFormFieldErrors,
  scrollToFirstTenderContestError,
  type TenderContestFormFieldErrors,
} from '../../lib/contest/contest-form-validation';
import {
  ContestOfferFieldError,
  fieldErrorInputClass,
} from '../contest-offer/ContestOfferFieldError';
import { buildFilterCategoryTree, getCategoryDisplayName, getSubcategoryDisplayName } from '../../lib/config/categoryConfig';
import { cn } from '../ui/utils';
import { ScheduleDateOffsetChips } from './ScheduleDateOffsetChips';
import {
  COMPLETION_DAY_OFFSET_OPTIONS,
  EVALUATION_DAY_OFFSET_OPTIONS,
  completionDateFromEvaluationOffset,
  evaluationDateFromSubmissionOffset,
  isDateOnOrBefore,
  minCompletionDateAfterEvaluation,
  minEvaluationDateAfterSubmission,
} from '../../lib/contest/contest-schedule-dates';

interface ContestFormSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  step?: number;
  layout?: 'default' | 'create';
  children: React.ReactNode;
  className?: string;
}

function ContestFormSection({
  title,
  description,
  icon,
  step,
  layout = 'default',
  children,
  className,
}: ContestFormSectionProps): React.ReactElement {
  const isCreateLayout = layout === 'create';

  return (
    <section
      className={cn(
        isCreateLayout ? 'px-4 py-6 sm:px-6' : 'space-y-6 border-b border-border pb-8',
        className,
      )}
    >
      <div className={cn(isCreateLayout ? 'mb-5' : 'mb-0')}>
        {isCreateLayout ? (
          <div className="flex items-start gap-3">
            {step !== undefined ? (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground"
                aria-hidden
              >
                {step}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              {icon}
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        )}
      </div>
      <div className={cn(isCreateLayout ? 'space-y-5' : 'space-y-6')}>{children}</div>
    </section>
  );
}

export interface TenderContestFormProps {
  onSubmit: (
    form: TenderContestFormData,
    newFiles: File[],
    keptDocuments: TenderContestDocumentMeta[],
    status: 'draft' | 'active',
  ) => void | Promise<void>;
  isSubmitting?: boolean;
  initialForm?: TenderContestFormData;
  existingDocuments?: TenderContestDocumentMeta[];
  layout?: 'default' | 'create';
}

const PERIOD_OPTIONS: { value: WarrantyGuaranteePeriod; label: string }[] = [
  { value: 'none', label: 'Brak' },
  { value: 'min_12', label: 'Min. 12 mies.' },
  { value: 'min_24', label: 'Min. 24 mies.' },
  { value: 'min_36', label: 'Min. 36 mies.' },
  { value: 'other', label: 'Inny' },
];

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isCompletionInvalid(
  completion: Date,
  evaluation: Date | null,
  submission: Date,
): boolean {
  if (evaluation && !Number.isNaN(evaluation.getTime())) {
    return isDateOnOrBefore(evaluation, completion);
  }
  return isDateOnOrBefore(submission, completion);
}

export function TenderContestForm({
  onSubmit,
  isSubmitting = false,
  initialForm,
  existingDocuments,
  layout = 'default',
}: TenderContestFormProps): React.ReactElement {
  const { user } = useUserProfile();
  const supabase = createClient();
  const [form, setForm] = useState<TenderContestFormData>(
    initialForm ?? createEmptyTenderContestForm(),
  );
  const [managedEntities, setManagedEntities] = useState<ManagedHousingEntity[]>([]);
  const [categoriesFromDb, setCategoriesFromDb] = useState<CategoryWithSubcategories[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [keptDocuments, setKeptDocuments] = useState<TenderContestDocumentMeta[]>(
    () => existingDocuments ?? [],
  );
  const [fieldErrors, setFieldErrors] = useState<TenderContestFormFieldErrors>({});
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const sortedManagedEntities = useMemo(
    () =>
      [...managedEntities].sort((a, b) =>
        formatManagedHousingEntitySelectLabel(a).localeCompare(
          formatManagedHousingEntitySelectLabel(b),
          'pl',
        ),
      ),
    [managedEntities],
  );

  const filterCategoryTree = useMemo(
    () => buildFilterCategoryTree(categoriesFromDb),
    [categoriesFromDb],
  );

  const hasValidSubmissionDeadline = useMemo(
    () => Boolean(form.submissionDeadline && !Number.isNaN(form.submissionDeadline.getTime())),
    [form.submissionDeadline],
  );

  const hasValidEvaluationDeadline = useMemo(
    () => Boolean(form.evaluationDeadline && !Number.isNaN(form.evaluationDeadline.getTime())),
    [form.evaluationDeadline],
  );

  const evaluationMinDate = useMemo(() => {
    if (!hasValidSubmissionDeadline) return undefined;
    return toDateInputValue(minEvaluationDateAfterSubmission(form.submissionDeadline));
  }, [form.submissionDeadline, hasValidSubmissionDeadline]);

  const completionMinDate = useMemo(() => {
    if (hasValidEvaluationDeadline) {
      return toDateInputValue(minCompletionDateAfterEvaluation(form.evaluationDeadline!));
    }
    if (!hasValidSubmissionDeadline) return undefined;
    return toDateInputValue(minEvaluationDateAfterSubmission(form.submissionDeadline));
  }, [
    form.evaluationDeadline,
    form.submissionDeadline,
    hasValidEvaluationDeadline,
    hasValidSubmissionDeadline,
  ]);

  useEffect(() => {
    if (!initialForm) return;
    setForm({
      ...initialForm,
      category: initialForm.category
        ? getCategoryDisplayName({ name: initialForm.category })
        : initialForm.category,
      subcategory: initialForm.subcategory
        ? getSubcategoryDisplayName({ name: initialForm.subcategory }) ?? initialForm.subcategory
        : initialForm.subcategory,
    });
  }, [initialForm]);

  useEffect(() => {
    if (existingDocuments === undefined) return;
    setKeptDocuments(existingDocuments);
  }, [existingDocuments]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!user?.id) {
        setIsLoadingMeta(false);
        return;
      }
      setIsLoadingMeta(true);
      try {
        const { data: company } = await fetchUserPrimaryCompany(supabase, user.id);
        if (company?.id) {
          const { data: entities } = await fetchManagerHousingEntities(supabase, company.id);
          if (entities?.length) setManagedEntities(entities);
        }
        const { data: cats } = await fetchAllCategoriesWithSubcategories(supabase);
        if (cats) setCategoriesFromDb(cats);
      } finally {
        setIsLoadingMeta(false);
      }
    };
    void load();
  }, [user?.id, supabase]);

  const displayedErrors = showFieldErrors ? fieldErrors : {};

  const patchForm = (patch: Partial<TenderContestFormData>): void => {
    if (showFieldErrors) {
      setFieldErrors((prev) => clearTenderContestFieldErrorsForPatch(prev, patch));
    }
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleFileUpload = (accepted: File[], rejections: FileRejection[]): void => {
    if (rejections.length > 0) {
      setShowFieldErrors(true);
      setFieldErrors((prev) => ({
        ...prev,
        documents: rejections[0].errors[0]?.message ?? 'Nieprawidłowy plik',
      }));
      return;
    }
    setPendingFiles((prev) => [...prev, ...accepted].slice(0, 20));
    if (showFieldErrors) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.documents;
        return next;
      });
    }
  };

  const handleSubmit = async (status: 'draft' | 'active'): Promise<void> => {
    const errors = getTenderContestFormFieldErrors(
      form,
      pendingFiles,
      keptDocuments,
      managedEntities.length > 0,
      status,
    );
    if (hasTenderContestFormFieldErrors(errors)) {
      setShowFieldErrors(true);
      setFieldErrors(errors);
      requestAnimationFrame(() => scrollToFirstTenderContestError(errors));
      return;
    }
    setShowFieldErrors(false);
    setFieldErrors({});
    await onSubmit(form, pendingFiles, keptDocuments, status);
  };

  const updateCriterion = (
    id: string,
    patch: Partial<Pick<SelectionCriterionItem, 'name' | 'weight'>>,
  ): void => {
    if (showFieldErrors) {
      setFieldErrors((prev) => {
        const next: TenderContestFormFieldErrors = { ...prev };
        if ('name' in patch && next.criteriaItems?.[id]) {
          const items = { ...next.criteriaItems };
          delete items[id];
          if (Object.keys(items).length > 0) {
            next.criteriaItems = items;
          } else {
            delete next.criteriaItems;
          }
        }
        if ('weight' in patch) {
          delete next.selectionCriteria;
        }
        return next;
      });
    }
    setForm((prev) => ({
      ...prev,
      selectionCriteria: {
        items: prev.selectionCriteria.items.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      },
    }));
  };

  const addCriterion = (): void => {
    setForm((prev) => ({
      ...prev,
      selectionCriteria: {
        items: [
          ...prev.selectionCriteria.items,
          {
            id: `custom-${Date.now()}`,
            name: '',
            weight: 0,
            type: 'other',
          },
        ],
      },
    }));
  };

  const removeCriterion = (id: string): void => {
    setForm((prev) => {
      if (prev.selectionCriteria.items.length <= 1) return prev;
      return {
        ...prev,
        selectionCriteria: {
          items: prev.selectionCriteria.items.filter((item) => item.id !== id),
        },
      };
    });
  };

  const maybeClearDocumentsError = (): void => {
    if (!showFieldErrors) return;
    setFieldErrors((prev) => {
      if (!prev.documents) return prev;
      const next = { ...prev };
      delete next.documents;
      return next;
    });
  };

  const handleSubmissionDeadlineChange = (value: string): void => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;
    if (showFieldErrors) {
      setFieldErrors((prev) => clearTenderContestFieldErrorsForPatch(prev, { submissionDeadline: d }));
    }
    setForm((prev) => {
      const next: TenderContestFormData = { ...prev, submissionDeadline: d };
      if (
        prev.completionDate &&
        isCompletionInvalid(prev.completionDate, prev.evaluationDeadline, d)
      ) {
        next.completionDate = null;
      }
      if (
        prev.evaluationDeadline &&
        prev.evaluationDeadline.getTime() <= d.getTime()
      ) {
        next.evaluationDeadline = null;
      }
      return next;
    });
  };

  const handleEvaluationDeadlineChange = (value: string): void => {
    const evaluationDeadline = value ? new Date(value) : null;
    if (showFieldErrors) {
      setFieldErrors((prev) =>
        clearTenderContestFieldErrorsForPatch(prev, { evaluationDeadline }),
      );
    }
    setForm((prev) => {
      const next: TenderContestFormData = { ...prev, evaluationDeadline };
      if (
        evaluationDeadline &&
        prev.completionDate &&
        isCompletionInvalid(prev.completionDate, evaluationDeadline, prev.submissionDeadline)
      ) {
        next.completionDate = null;
      }
      return next;
    });
  };

  const criteriaWeightSum = selectionCriteriaTotalWeight(form.selectionCriteria.items);
  const isCreateLayout = layout === 'create';

  return (
    <form
      noValidate
      className={cn(
        isCreateLayout ? 'divide-y divide-border' : 'space-y-8',
        isCreateLayout &&
          '[&_input]:h-11 [&_[data-slot=select-trigger]]:h-11 [&_textarea]:min-h-[8.5rem] [&_label]:text-sm [&_label]:font-medium',
      )}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit('active');
      }}
    >
      <ContestFormSection
        step={1}
        layout={layout}
        title="Informacje podstawowe"
        icon={!isCreateLayout ? <FileText className="h-5 w-5" /> : undefined}
      >
          <div>
            <Label htmlFor="contest-title">Tytuł konkursu *</Label>
            <Input
              id="contest-title"
              maxLength={75}
              value={form.title}
              onChange={(e) => patchForm({ title: e.target.value })}
              placeholder="np. Remont posadzek"
              className={cn('mt-1', fieldErrorInputClass(Boolean(displayedErrors.title)))}
              aria-invalid={Boolean(displayedErrors.title)}
            />
            <ContestOfferFieldError message={displayedErrors.title} />
            <p className="text-xs text-muted-foreground mt-1">{form.title.length}/75</p>
          </div>

          <div>
            <Label htmlFor="contest-desc">Szczegółowy zakres i uwagi *</Label>
            <Textarea
              id="contest-desc"
              rows={6}
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
              placeholder="Opisz zakres prac, oczekiwania i inne istotne informacje..."
              className={cn('mt-1', fieldErrorInputClass(Boolean(displayedErrors.description)))}
              aria-invalid={Boolean(displayedErrors.description)}
            />
            <ContestOfferFieldError message={displayedErrors.description} />
          </div>

          <div>
            <Label>Nieruchomość *</Label>
            {isLoadingMeta ? (
              <div className="h-10 bg-muted rounded-md animate-pulse mt-1" />
            ) : managedEntities.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">
                Brak zapisanych wspólnot lub spółdzielni. Użyty zostanie adres firmy z profilu.
              </p>
            ) : (
              <Select
                value={form.managedEntityId || undefined}
                onValueChange={(v) => patchForm({ managedEntityId: v })}
              >
                <SelectTrigger
                  id="contest-managed-entity"
                  className={cn('mt-1', fieldErrorInputClass(Boolean(displayedErrors.managedEntityId)))}
                  aria-invalid={Boolean(displayedErrors.managedEntityId)}
                >
                  <SelectValue placeholder="Wybierz wspólnotę lub spółdzielnię" />
                </SelectTrigger>
                <SelectContent>
                  {sortedManagedEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {formatManagedHousingEntitySelectLabel(entity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <ContestOfferFieldError message={displayedErrors.managedEntityId} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Kategoria *</Label>
              <Select
                value={form.category || undefined}
                onValueChange={(v) => patchForm({ category: v, subcategory: '' })}
                disabled={isLoadingMeta}
              >
                <SelectTrigger
                  id="contest-category"
                  className={cn('mt-1', fieldErrorInputClass(Boolean(displayedErrors.category)))}
                  aria-invalid={Boolean(displayedErrors.category)}
                >
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {filterCategoryTree.map((c) => (
                    <SelectItem key={c.id} value={c.filterKey}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ContestOfferFieldError message={displayedErrors.category} />
            </div>
            <div>
              <Label>Podkategoria *</Label>
              <Select
                value={form.subcategory || undefined}
                onValueChange={(v) => patchForm({ subcategory: v })}
                disabled={!form.category || isLoadingMeta}
              >
                <SelectTrigger
                  id="contest-subcategory"
                  className={cn('mt-1', fieldErrorInputClass(Boolean(displayedErrors.subcategory)))}
                  aria-invalid={Boolean(displayedErrors.subcategory)}
                >
                  <SelectValue placeholder="Wybierz podkategorię" />
                </SelectTrigger>
                <SelectContent>
                  {filterCategoryTree
                    .find((c) => c.filterKey === form.category)
                    ?.subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.filterKey}>
                        {sub.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <ContestOfferFieldError message={displayedErrors.subcategory} />
            </div>
          </div>

          <div id="contest-documents">
            <Label className="text-base font-medium">Dokumentacja konkursowa *</Label>

            {(keptDocuments.length > 0 || pendingFiles.length > 0) && (
              <ul className="mt-2 mb-3 space-y-2">
                {keptDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary/25 bg-primary/5 px-3.5 py-3 text-sm shadow-sm"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <File className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{doc.name}</span>
                        <span className="text-xs text-muted-foreground">Zapisany w szkicu</span>
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setKeptDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                        if (pendingFiles.length + keptDocuments.length > 1) {
                          maybeClearDocumentsError();
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
                {pendingFiles.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary/25 bg-primary/5 px-3.5 py-3 text-sm shadow-sm"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                        <Upload className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Nowy plik — zostanie wysłany przy zapisie
                        </span>
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
                        if (pendingFiles.length + keptDocuments.length > 1) {
                          maybeClearDocumentsError();
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Dropzone
              accept={{
                'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'application/vnd.ms-excel': ['.xls'],
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              }}
              maxFiles={20}
              maxSize={10 * 1024 * 1024}
              onDrop={handleFileUpload}
              disabled={isSubmitting}
              className={cn(
                'mt-2',
                (keptDocuments.length > 0 || pendingFiles.length > 0) && 'py-6',
                displayedErrors.documents && 'border-destructive bg-destructive/5',
              )}
            >
              <DropzoneEmptyState>
                <div
                  className={cn(
                    'flex flex-col items-center',
                    keptDocuments.length > 0 || pendingFiles.length > 0 ? 'py-2' : 'py-10',
                  )}
                >
                  <Upload
                    className={cn(
                      'text-muted-foreground mb-3',
                      keptDocuments.length > 0 || pendingFiles.length > 0 ? 'h-8 w-8' : 'h-12 w-12',
                    )}
                  />
                  <span className="text-lg font-semibold text-primary">
                    {keptDocuments.length > 0 || pendingFiles.length > 0
                      ? 'Dodaj kolejne pliki'
                      : 'Dodaj pliki'}
                  </span>
                  <p className="text-sm text-muted-foreground text-center max-w-md mt-2">
                    PDF, DOC, DOCX, XLS, XLSX, obrazy — min. 1 plik, max 10&nbsp;MB każdy.
                  </p>
                </div>
              </DropzoneEmptyState>
              <DropzoneContent />
            </Dropzone>
            <ContestOfferFieldError message={displayedErrors.documents} />
          </div>
      </ContestFormSection>

      <ContestFormSection step={2} layout={layout} title="Harmonogram">
          <div>
            <Label htmlFor="submission-deadline">Zakończenie przyjmowania ofert *</Label>
            <Input
              id="submission-deadline"
              type="datetime-local"
              className={cn(
                'mt-1 w-fit max-w-full pe-2 [&::-webkit-calendar-picker-indicator]:ms-1',
                fieldErrorInputClass(Boolean(displayedErrors.submissionDeadline)),
              )}
              aria-invalid={Boolean(displayedErrors.submissionDeadline)}
              value={toDatetimeLocalValue(form.submissionDeadline)}
              onChange={(e) => handleSubmissionDeadlineChange(e.target.value)}
            />
            <ContestOfferFieldError message={displayedErrors.submissionDeadline} />
          </div>

          <div>
            <Label htmlFor="evaluation-deadline">Rozstrzygnięcia konkursu *</Label>
            <Input
              id="evaluation-deadline"
              type="date"
              className={cn(
                'mt-1 w-fit max-w-full pe-2 [&::-webkit-calendar-picker-indicator]:ms-1',
                fieldErrorInputClass(Boolean(displayedErrors.evaluationDeadline)),
              )}
              aria-invalid={Boolean(displayedErrors.evaluationDeadline)}
              disabled={!hasValidSubmissionDeadline}
              min={evaluationMinDate}
              value={toDateInputValue(form.evaluationDeadline)}
              onChange={(e) => handleEvaluationDeadlineChange(e.target.value)}
            />
            <ScheduleDateOffsetChips
              offsets={EVALUATION_DAY_OFFSET_OPTIONS}
              disabled={!hasValidSubmissionDeadline || isSubmitting}
              onSelect={(days) => {
                if (!hasValidSubmissionDeadline) return;
                handleEvaluationDeadlineChange(
                  toDateInputValue(
                    evaluationDateFromSubmissionOffset(form.submissionDeadline, days),
                  ),
                );
              }}
            />
            <ContestOfferFieldError message={displayedErrors.evaluationDeadline} />
          </div>

          <div>
            <Label htmlFor="completion-date">Termin wykonania</Label>
            <Input
              id="completion-date"
              type="date"
              className={cn(
                'mt-1 w-fit max-w-full pe-2 [&::-webkit-calendar-picker-indicator]:ms-1',
                fieldErrorInputClass(Boolean(displayedErrors.completionDate)),
              )}
              aria-invalid={Boolean(displayedErrors.completionDate)}
              disabled={!hasValidEvaluationDeadline}
              min={completionMinDate}
              value={toDateInputValue(form.completionDate)}
              onChange={(e) => {
                patchForm({
                  completionDate: e.target.value ? new Date(e.target.value) : null,
                });
              }}
            />
            <ScheduleDateOffsetChips
              offsets={COMPLETION_DAY_OFFSET_OPTIONS}
              disabled={!hasValidEvaluationDeadline || isSubmitting}
              onSelect={(days) => {
                if (!form.evaluationDeadline) return;
                patchForm({
                  completionDate: completionDateFromEvaluationOffset(form.evaluationDeadline, days),
                });
              }}
            />
            <ContestOfferFieldError message={displayedErrors.completionDate} />
          </div>

          <div className="space-y-3">
            <Label>Wizja lokalna *</Label>
            <RadioGroup
              value={form.siteVisitType}
              onValueChange={(v) =>
                patchForm({
                  siteVisitType: v as TenderContestFormData['siteVisitType'],
                  siteVisitNotes: v === 'not_required' ? '' : form.siteVisitNotes,
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_required" id="sv-none" />
                <Label htmlFor="sv-none" className="font-normal">
                  Niewymagana
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="optional" id="sv-opt" />
                <Label htmlFor="sv-opt" className="font-normal">
                  Opcjonalna
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mandatory" id="sv-req" />
                <Label htmlFor="sv-req" className="font-normal">
                  Obowiązkowa
                </Label>
              </div>
            </RadioGroup>
          </div>

          {(form.siteVisitType === 'optional' || form.siteVisitType === 'mandatory') && (
            <div>
              <Label htmlFor="site-visit-notes">Osoba do kontaktu i terminy wizji</Label>
              <Textarea
                id="site-visit-notes"
                rows={4}
                className={cn('mt-1', fieldErrorInputClass(Boolean(displayedErrors.siteVisitNotes)))}
                aria-invalid={Boolean(displayedErrors.siteVisitNotes)}
                value={form.siteVisitNotes}
                onChange={(e) => patchForm({ siteVisitNotes: e.target.value })}
                placeholder="Wizja lokalna odbędzie się w dniu..."
              />
              <ContestOfferFieldError message={displayedErrors.siteVisitNotes} />
            </div>
          )}
      </ContestFormSection>

      <ContestFormSection
        step={3}
        layout={layout}
        title="Wymogi"
        description="Zaznacz dokumenty i oświadczenia oczekiwane od firm składających oferty."
      >
          <div className="flex items-start gap-3">
            <Checkbox
              id="req-oc"
              checked={form.formalRequirements.insuranceOc}
              onCheckedChange={(c) =>
                setForm((prev) => ({
                  ...prev,
                  formalRequirements: { ...prev.formalRequirements, insuranceOc: c === true },
                }))
              }
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="req-oc" className="font-normal">
                Aktualna polisa OC wykonawcy
              </Label>
              {form.formalRequirements.insuranceOc && (
                <Input
                  type="number"
                  min={0}
                  className="max-w-xs"
                  placeholder="Min. suma gwarancyjna (zł)"
                  value={form.formalRequirements.insuranceOcMinAmount ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      formalRequirements: {
                        ...prev.formalRequirements,
                        insuranceOcMinAmount: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    }))
                  }
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="req-zus"
              checked={form.formalRequirements.zusUsCertificates}
              onCheckedChange={(c) =>
                setForm((prev) => ({
                  ...prev,
                  formalRequirements: { ...prev.formalRequirements, zusUsCertificates: c === true },
                }))
              }
            />
            <Label htmlFor="req-zus" className="font-normal">
              Zaświadczenia o niezaleganiu w ZUS i US (nie starsze niż 3 miesiące)
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="req-ref"
              checked={form.formalRequirements.references}
              onCheckedChange={(c) =>
                setForm((prev) => ({
                  ...prev,
                  formalRequirements: { ...prev.formalRequirements, references: c === true },
                }))
              }
            />
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <Label htmlFor="req-ref" className="font-normal">
                Referencje — min.
              </Label>
              <Input
                type="number"
                min={1}
                className="w-16"
                disabled={!form.formalRequirements.references}
                value={form.formalRequirements.referencesMinCount ?? 2}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    formalRequirements: {
                      ...prev.formalRequirements,
                      referencesMinCount: Number(e.target.value) || 2,
                    },
                  }))
                }
              />
              <span className="text-sm">realizacji z ostatnich</span>
              <Input
                type="number"
                min={1}
                className="w-16"
                disabled={!form.formalRequirements.references}
                value={form.formalRequirements.referencesYears ?? 3}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    formalRequirements: {
                      ...prev.formalRequirements,
                      referencesYears: Number(e.target.value) || 3,
                    },
                  }))
                }
              />
              <span className="text-sm">lat</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="req-cert"
              checked={form.formalRequirements.professionalCertificates}
              onCheckedChange={(c) =>
                setForm((prev) => ({
                  ...prev,
                  formalRequirements: {
                    ...prev.formalRequirements,
                    professionalCertificates: c === true,
                  },
                }))
              }
            />
            <Label htmlFor="req-cert" className="font-normal">
              Certyfikaty zawodowe
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="req-lic"
              checked={form.formalRequirements.professionalLicenses}
              onCheckedChange={(c) =>
                setForm((prev) => ({
                  ...prev,
                  formalRequirements: {
                    ...prev.formalRequirements,
                    professionalLicenses: c === true,
                  },
                }))
              }
            />
            <Label htmlFor="req-lic" className="font-normal">
              Uprawnienia zawodowe
            </Label>
          </div>
      </ContestFormSection>

      <ContestFormSection
        step={4}
        layout={layout}
        title="Warunki"
        className={isCreateLayout ? undefined : 'border-b-0 pb-0'}
      >
          <div id="contest-selection-criteria">
            <Label>Kryteria wyboru wykonawcy</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Określ wagę każdego kryterium. Suma musi wynosić 100%.
            </p>
            <div className="space-y-2 max-w-lg">
              {form.selectionCriteria.items.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      data-criterion-id={item.id}
                      placeholder="Nazwa kryterium"
                      value={item.name}
                      onChange={(e) => updateCriterion(item.id, { name: e.target.value })}
                      className={cn(
                        fieldErrorInputClass(Boolean(displayedErrors.criteriaItems?.[item.id])),
                      )}
                      aria-invalid={Boolean(displayedErrors.criteriaItems?.[item.id])}
                    />
                    <ContestOfferFieldError message={displayedErrors.criteriaItems?.[item.id]} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className={cn(
                        'w-20',
                        fieldErrorInputClass(Boolean(displayedErrors.selectionCriteria)),
                      )}
                      value={item.weight}
                      onChange={(e) =>
                        updateCriterion(item.id, {
                          weight: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        })
                      }
                      aria-label={`Waga: ${item.name || 'kryterium'}`}
                      aria-invalid={Boolean(displayedErrors.selectionCriteria)}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={form.selectionCriteria.items.length <= 1}
                    onClick={() => removeCriterion(item.id)}
                    aria-label="Usuń kryterium"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={addCriterion}
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj kryterium
            </Button>
            <p
              className={cn(
                'text-xs mt-2',
                displayedErrors.selectionCriteria ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              Suma: {criteriaWeightSum}% (wymagane 100%)
            </p>
            <ContestOfferFieldError message={displayedErrors.selectionCriteria} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Wymagany okres gwarancji</Label>
              <Select
                value={form.warrantyPeriod || undefined}
                onValueChange={(v) =>
                  patchForm({ warrantyPeriod: v as WarrantyGuaranteePeriod })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rękojmia</Label>
              <Select
                value={form.guaranteePeriod || undefined}
                onValueChange={(v) =>
                  patchForm({ guaranteePeriod: v as WarrantyGuaranteePeriod })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Wybierz" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Wadium</Label>
            <RadioGroup
              value={form.depositRequired ? 'required' : 'none'}
              onValueChange={(v) =>
                patchForm({
                  depositRequired: v === 'required',
                  depositAmount: v === 'required' ? form.depositAmount : null,
                  depositInstructions: v === 'required' ? form.depositInstructions : '',
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="wad-none" />
                <Label htmlFor="wad-none" className="font-normal">
                  Brak wadium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="required" id="wad-req" />
                <Label htmlFor="wad-req" className="font-normal">
                  Wymagane wadium
                </Label>
              </div>
            </RadioGroup>

            {form.depositRequired && (
              <div className="space-y-3 pl-4 border-l-2">
                <div>
                  <Label htmlFor="contest-deposit-amount">Kwota wadium (zł)</Label>
                  <Input
                    id="contest-deposit-amount"
                    type="number"
                    min={0}
                    className={cn(
                      'mt-1 max-w-xs',
                      fieldErrorInputClass(Boolean(displayedErrors.depositAmount)),
                    )}
                    aria-invalid={Boolean(displayedErrors.depositAmount)}
                    value={form.depositAmount ?? ''}
                    onChange={(e) =>
                      patchForm({
                        depositAmount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <ContestOfferFieldError message={displayedErrors.depositAmount} />
                </div>
                <div>
                  <Label htmlFor="contest-deposit-instructions">Instrukcja wpłaty</Label>
                  <Textarea
                    id="contest-deposit-instructions"
                    rows={3}
                    className={cn(
                      'mt-1',
                      fieldErrorInputClass(Boolean(displayedErrors.depositInstructions)),
                    )}
                    aria-invalid={Boolean(displayedErrors.depositInstructions)}
                    value={form.depositInstructions}
                    onChange={(e) => patchForm({ depositInstructions: e.target.value })}
                  />
                  <ContestOfferFieldError message={displayedErrors.depositInstructions} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Termin płatności faktury</Label>
            <RadioGroup
              value={form.paymentTerms.mode}
              onValueChange={(v) =>
                patchForm({
                  paymentTerms: {
                    mode: v as 'standard_14' | 'custom',
                    customDays: v === 'custom' ? form.paymentTerms.customDays ?? 30 : undefined,
                  },
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard_14" id="pay-14" />
                <Label htmlFor="pay-14" className="font-normal">
                  Standardowy (14 dni)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="pay-custom" />
                <Label htmlFor="pay-custom" className="font-normal">
                  Wydłużony (inny)
                </Label>
              </div>
            </RadioGroup>
            {form.paymentTerms.mode === 'custom' && (
              <div className="pl-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="contest-payment-days" className="font-normal">
                    Liczba dni:
                  </Label>
                  <Input
                    id="contest-payment-days"
                    type="number"
                    min={1}
                    className={cn(
                      'w-24',
                      fieldErrorInputClass(Boolean(displayedErrors.paymentTermsCustomDays)),
                    )}
                    aria-invalid={Boolean(displayedErrors.paymentTermsCustomDays)}
                    value={form.paymentTerms.customDays ?? ''}
                    onChange={(e) =>
                      patchForm({
                        paymentTerms: {
                          ...form.paymentTerms,
                          customDays: Number(e.target.value) || undefined,
                        },
                      })
                    }
                  />
                </div>
                <ContestOfferFieldError message={displayedErrors.paymentTermsCustomDays} />
              </div>
            )}
          </div>
      </ContestFormSection>

      <div
        className={cn(
          'border-t bg-muted/25',
          isCreateLayout
            ? 'px-4 py-4 sm:px-6'
            : 'sticky bottom-0 z-10 -mx-4 mt-2 bg-card/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:-mx-0 sm:px-0',
        )}
      >
        <div
          className={cn(
            'flex gap-3',
            isCreateLayout
              ? 'flex-col-reverse sm:flex-row sm:justify-end'
              : 'flex-col sm:flex-row sm:justify-end',
          )}
        >
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className={cn(isCreateLayout && 'h-11 w-full sm:w-auto')}
            onClick={() => void handleSubmit('draft')}
          >
            <Save className="h-4 w-4 mr-2" />
            Zapisz jako szkic
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(isCreateLayout && 'h-11 w-full sm:w-auto')}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publikowanie…
              </>
            ) : (
              'Opublikuj konkurs'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
