'use client';

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  Send,
  Calculator,
  MapPin,
  Clock,
  Users,
  Eye,
  Building2,
  Briefcase,
  DollarSign,
  FileText,
  Paperclip,
  Loader2,
  Info,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { useUserProfile } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { createClient } from '../lib/supabase/client';
import { uploadJobAttachment } from '../lib/storage/job-attachments';

export interface JobApplicationFormFields {
  proposedPrice: string;
  vatRate: '8' | '23';
  workingDays: string;
  startDate: string;
  guaranteeMonths: string;
  estimatedCompletion: string;
  coverLetter: string;
  additionalNotes: string;
}

export interface JobApplicationSubmitPayload {
  id: string;
  contractorId: string;
  contractorName: string;
  proposedPrice: number;
  estimatedCompletion: string;
  coverLetter: string;
  additionalNotes?: string;
  submittedAt: Date;
  vatRate?: 8 | 23;
  workingDays?: number;
  startDate?: string;
  guaranteeMonths?: number;
  attachments?: Array<{ id: string; name: string; type: string; url: string; size: number }>;
}

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  companyName: string;
  jobId?: string;
  jobData?: Record<string, unknown>;
  onApplicationSubmit: (applicationData: JobApplicationSubmitPayload) => void | Promise<void>;
  applicationForm: JobApplicationFormFields;
  setApplicationForm: (form: JobApplicationFormFields) => void;
  postType?: 'job' | 'contest';
}

const COVER_LETTER_MIN = 50;
const MAX_STAGED_FILES = 10;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1.5 text-sm font-medium text-destructive">{message}</p>;
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  jobTitle,
  companyName,
  jobId,
  jobData,
  onApplicationSubmit,
  applicationForm,
  setApplicationForm,
  postType,
}) => {
  const { user } = useUserProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  const isTender = postType === 'contest';

  const formatApplicationsCount = (count: number): string => {
    if (count === 0) return 'Brak ofert';
    if (count === 1) return '1 oferta';

    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;
    const useFewForm = lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14);

    return `${count} ${useFewForm ? 'oferty' : 'ofert'}`;
  };

  const applicationsRaw = (jobData as { applications?: number | string } | undefined)?.applications;
  const applicationsCount =
    typeof applicationsRaw === 'string' ? Number.parseInt(applicationsRaw, 10) : applicationsRaw;
  const hasApplicationsCount = Number.isFinite(applicationsCount) && (applicationsCount ?? -1) >= 0;
  const visitsCount = jobData ? (jobData as { visits_count?: number }).visits_count : undefined;
  const hasVisits = typeof visitsCount === 'number' && visitsCount > 0;

  const formatLocation = (location: string | { city: string; sublocality_level_1?: string } | undefined): string => {
    if (!location) return 'Nieznana lokalizacja';

    if (typeof location === 'string') {
      return location;
    }

    if (typeof location === 'object' && location !== null && 'city' in location) {
      if (location.sublocality_level_1) {
        return `${location.city || 'Nieznana'}, ${location.sublocality_level_1}`;
      }
      return location.city || 'Nieznana lokalizacja';
    }

    return 'Nieznana lokalizacja';
  };

  if (!isOpen) return null;

  const handleInputChange = (field: keyof JobApplicationFormFields, value: string) => {
    setApplicationForm({ ...applicationForm, [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateTender = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!applicationForm.proposedPrice) {
      newErrors.proposedPrice = 'Podaj proponowaną cenę';
    } else if (isNaN(Number(applicationForm.proposedPrice)) || Number(applicationForm.proposedPrice) <= 0) {
      newErrors.proposedPrice = 'Podaj prawidłową kwotę';
    }

    if (!applicationForm.estimatedCompletion) {
      newErrors.estimatedCompletion = 'Podaj przewidywany czas realizacji';
    }

    if (!applicationForm.coverLetter || applicationForm.coverLetter.length < COVER_LETTER_MIN) {
      newErrors.coverLetter = `Opis oferty musi mieć min. ${COVER_LETTER_MIN} znaków`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateJob = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!applicationForm.proposedPrice) {
      newErrors.proposedPrice = 'Podaj cenę netto';
    } else if (isNaN(Number(applicationForm.proposedPrice)) || Number(applicationForm.proposedPrice) <= 0) {
      newErrors.proposedPrice = 'Podaj prawidłową kwotę netto';
    }

    if (!applicationForm.startDate) {
      newErrors.startDate = 'Wybierz termin rozpoczęcia';
    }

    const wd = Number(applicationForm.workingDays);
    if (!applicationForm.workingDays || !Number.isInteger(wd) || wd < 1) {
      newErrors.workingDays = 'Podaj liczbę dni roboczych (min. 1)';
    }

    const gm = Number(applicationForm.guaranteeMonths);
    if (!applicationForm.guaranteeMonths || !Number.isInteger(gm) || gm < 1) {
      newErrors.guaranteeMonths = 'Podaj okres gwarancji w miesiącach (min. 1)';
    }

    if (!applicationForm.coverLetter || applicationForm.coverLetter.length < COVER_LETTER_MIN) {
      newErrors.coverLetter = `Opis musi mieć min. ${COVER_LETTER_MIN} znaków`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setStagedFiles((prev) => {
      const next = [...prev, ...Array.from(files)];
      return next.slice(0, MAX_STAGED_FILES);
    });
    event.target.value = '';
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const valid = isTender ? validateTender() : validateJob();
    if (!valid) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsSubmitting(true);

    try {
      const basePayload: JobApplicationSubmitPayload = {
        id: Math.random().toString(36).substring(2, 11),
        contractorId: user?.id || '',
        contractorName: user?.firstName || '',
        proposedPrice: Number(applicationForm.proposedPrice),
        estimatedCompletion: isTender ? applicationForm.estimatedCompletion : '',
        coverLetter: applicationForm.coverLetter,
        additionalNotes: applicationForm.additionalNotes || undefined,
        submittedAt: new Date(),
      };

      if (!isTender) {
        basePayload.vatRate = applicationForm.vatRate === '8' ? 8 : 23;
        basePayload.workingDays = Math.floor(Number(applicationForm.workingDays));
        basePayload.startDate = applicationForm.startDate;
        basePayload.guaranteeMonths = Math.floor(Number(applicationForm.guaranteeMonths));

        if (!jobId || !user?.id) {
          toast.error('Brak identyfikatora zgłoszenia — odśwież stronę i spróbuj ponownie.');
          setIsSubmitting(false);
          return;
        }

        const supabase = createClient();
        const uploaded: Array<{ id: string; name: string; type: string; url: string; size: number }> = [];

        for (const file of stagedFiles) {
          const { data: up, error: upErr } = await uploadJobAttachment(file, user.id, jobId);
          if (upErr || !up) {
            toast.error(upErr?.message || 'Nie udało się przesłać załącznika');
            setIsSubmitting(false);
            return;
          }
          uploaded.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            type: up.type === 'image' ? 'portfolio' : 'other',
            url: up.url,
            size: file.size,
          });
        }

        if (uploaded.length > 0) {
          basePayload.attachments = uploaded;
        }
      }

      const result = onApplicationSubmit(basePayload);
      if (result instanceof Promise) {
        await result;
      }

      setStagedFiles([]);
      await new Promise((resolve) => setTimeout(resolve, 50));
      onClose();
    } catch {
      toast.error('Wystąpił błąd podczas wysyłania oferty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryBesideOfferName =
    jobData?.category || isTender ? (
      <div className="flex max-w-full shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kategoria</span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {jobData?.category && (
            <Badge variant="secondary" className="text-xs font-normal">
              {String((jobData as { category?: string }).category || '')}
            </Badge>
          )}
          {isTender && (
            <Badge className="border-amber-200 bg-amber-50 text-xs font-normal text-amber-950 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              Przetarg
            </Badge>
          )}
        </div>
      </div>
    ) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex min-h-0 min-w-full max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-2xl lg:min-w-[900px] lg:max-w-[min(96vw,1120px)]">
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-primary px-6 py-5 pr-12 text-left text-white">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-sm"
              aria-hidden
            >
              {isTender ? <Briefcase className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge className="border-white/15 bg-white/10 text-[11px] font-medium text-white hover:bg-white/15">
                  {isTender ? 'Przetarg' : 'Oferta wykonawcy'}
                </Badge>
                {jobData?.category ? (
                  <Badge variant="secondary" className="border-white/15 bg-white/10 text-[11px] font-medium text-white hover:bg-white/15">
                    {String((jobData as { category?: string }).category || '')}
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="text-xl font-semibold leading-tight tracking-tight text-white">
                {isTender ? 'Złóż ofertę w przetargu' : 'Złóż ofertę'}
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/75">
                Przygotuj kompletną, profesjonalną ofertę. Dane możesz sprawdzić przed wysłaniem, ale po złożeniu nie będzie już możliwości edycji.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b bg-gradient-to-b from-muted/60 via-muted/30 to-background">
            <div className="space-y-4 px-6 py-5">
              <div className="flex gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm"
                  aria-hidden
                >
                  {isTender ? <Briefcase className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground">{jobTitle}</h3>
                    {categoryBesideOfferName}
                  </div>
                  {(hasApplicationsCount || hasVisits) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      {hasApplicationsCount && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1">
                          <Users className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          {formatApplicationsCount(applicationsCount ?? 0)}
                        </span>
                      )}
                      {hasApplicationsCount && hasVisits && (
                        <span className="text-muted-foreground/50" aria-hidden>
                          ·
                        </span>
                      )}
                      {hasVisits && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-1">
                          <Eye className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          {visitsCount} wyświetleń
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/90 p-3 shadow-sm sm:p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Szczegóły ogłoszenia
                </p>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-3">
                  <li className="flex min-w-0 gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <span className="block text-xs text-muted-foreground">Zamawiający</span>
                      <span className="text-sm font-medium text-foreground">{companyName}</span>
                    </div>
                  </li>
                  {jobData?.location && (
                    <li className="flex min-w-0 gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <span className="block text-xs text-muted-foreground">Lokalizacja</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatLocation(jobData.location as string | { city: string; sublocality_level_1?: string })}
                        </span>
                      </div>
                    </li>
                  )}
                  {jobData?.salary && (
                    <li className="flex min-w-0 gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
                      <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/80" aria-hidden />
                      <div className="min-w-0">
                        <span className="block text-xs text-muted-foreground">Budżet / stawka</span>
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-400/90">
                          {String((jobData as { salary?: string | number }).salary || '')}
                        </span>
                      </div>
                    </li>
                  )}
                  {jobData?.postedTime && (
                    <li className="flex min-w-0 gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <span className="block text-xs text-muted-foreground">Opublikowano</span>
                        <span className="text-sm font-medium text-foreground">
                          {String((jobData as { postedTime?: string | number }).postedTime || '')}
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              {jobData?.description && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Treść ogłoszenia
                  </p>
                  <div className="max-h-[5.5rem] overflow-y-auto rounded-xl border border-border/80 bg-card/90 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {String((jobData as { description?: string }).description || '')}
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
            {isTender ? (
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="space-y-1 border-b px-5 pb-4 pt-5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Calculator className="h-4 w-4 shrink-0" />
                    Formularz oferty
                  </CardTitle>
                  <CardDescription>
                    Uzupełnij kluczowe warunki wykonania oraz opisz, dlaczego Twoja oferta powinna zostać wybrana.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5 pt-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormSection title="Warunki cenowe">
                      <Label htmlFor="proposedPrice">Proponowana cena (zł) *</Label>
                      <Input
                        id="proposedPrice"
                        type="number"
                        placeholder="np. 5000"
                        value={applicationForm.proposedPrice}
                        onChange={(e) => handleInputChange('proposedPrice', e.target.value)}
                        className={errors.proposedPrice ? 'border-destructive' : ''}
                      />
                      <FieldError message={errors.proposedPrice} />
                    </FormSection>
                    <FormSection title="Termin realizacji">
                      <Label htmlFor="estimatedCompletion">Czas realizacji *</Label>
                      <Select
                        value={applicationForm.estimatedCompletion}
                        onValueChange={(value) => handleInputChange('estimatedCompletion', value)}
                      >
                        <SelectTrigger
                          id="estimatedCompletion"
                          className={errors.estimatedCompletion ? 'border-destructive' : ''}
                          aria-label="Czas realizacji"
                        >
                          <SelectValue placeholder="Wybierz czas realizacji" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-3 dni">1-3 dni</SelectItem>
                          <SelectItem value="1 tydzień">1 tydzień</SelectItem>
                          <SelectItem value="2 tygodnie">2 tygodnie</SelectItem>
                          <SelectItem value="1 miesiąc">1 miesiąc</SelectItem>
                          <SelectItem value="2-3 miesiące">2-3 miesiące</SelectItem>
                          <SelectItem value="więcej niż 3 miesiące">Więcej niż 3 miesiące</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.estimatedCompletion} />
                    </FormSection>
                  </div>
                  <FormSection
                    title="Opis oferty"
                    description="Opisz podejście do realizacji, doświadczenie oraz przewagi swojej oferty."
                  >
                    <Label htmlFor="coverLetterTender">Opis oferty *</Label>
                    <Textarea
                      id="coverLetterTender"
                      placeholder="Opisz swoją ofertę, podejście do realizacji zgłoszenia, doświadczenie i to co wyróżnia Cię na tle konkurencji..."
                      value={applicationForm.coverLetter}
                      onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                      className={`min-h-[120px] resize-y ${errors.coverLetter ? 'border-destructive' : ''}`}
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {errors.coverLetter ? <FieldError message={errors.coverLetter} /> : (
                        <span />
                      )}
                      <p className="text-sm text-muted-foreground">{applicationForm.coverLetter.length}/500 znaków</p>
                    </div>
                  </FormSection>
                  <FormSection title="Dodatkowe informacje" description="Opcjonalne uwagi, pytania lub założenia do współpracy.">
                    <Label htmlFor="additionalNotesTender">Dodatkowe uwagi</Label>
                    <Textarea
                      id="additionalNotesTender"
                      placeholder="Dodatkowe informacje, pytania lub uwagi dotyczące zgłoszenia..."
                      value={applicationForm.additionalNotes}
                      onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                      className="min-h-[88px] resize-y"
                    />
                  </FormSection>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-border/70 shadow-sm">
                <CardHeader className="space-y-1 border-b px-5 pb-4 pt-5">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Calculator className="h-4 w-4 shrink-0" />
                    Formularz oferty
                  </CardTitle>
                  <CardDescription>
                    Ustal cenę, harmonogram i warunki wykonania, a następnie krótko opisz sposób realizacji.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 px-5 pb-5 pt-5">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
                    <div className="space-y-4">
                      <FormSection
                        title="Dane ofertowe"
                        description="Podaj stawkę, termin rozpoczęcia i podstawowe parametry realizacji."
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <Label htmlFor="netPrice">Cena netto (PLN) *</Label>
                            <Input
                              id="netPrice"
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="np. 5000"
                              value={applicationForm.proposedPrice}
                              onChange={(e) => handleInputChange('proposedPrice', e.target.value)}
                              className={errors.proposedPrice ? 'border-destructive' : ''}
                            />
                            <FieldError message={errors.proposedPrice} />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor="vatRate">VAT *</Label>
                            <Select
                              value={applicationForm.vatRate}
                              onValueChange={(v) => handleInputChange('vatRate', v as '8' | '23')}
                            >
                              <SelectTrigger id="vatRate">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8">8%</SelectItem>
                                <SelectItem value="23">23%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0">
                            <Label htmlFor="startDate">Termin rozpoczęcia *</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={applicationForm.startDate}
                              onChange={(e) => handleInputChange('startDate', e.target.value)}
                              className={errors.startDate ? 'border-destructive' : ''}
                            />
                            <FieldError message={errors.startDate} />
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor="workingDays">Czas realizacji (dni robocze) *</Label>
                            <Input
                              id="workingDays"
                              type="number"
                              min={1}
                              step={1}
                              placeholder="np. 5"
                              value={applicationForm.workingDays}
                              onChange={(e) => handleInputChange('workingDays', e.target.value)}
                              className={errors.workingDays ? 'border-destructive' : ''}
                            />
                            <FieldError message={errors.workingDays} />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="guaranteeMonths">Okres gwarancji (miesiące) *</Label>
                          <Input
                            id="guaranteeMonths"
                            type="number"
                            min={1}
                            step={1}
                            placeholder="np. 12"
                            value={applicationForm.guaranteeMonths}
                            onChange={(e) => handleInputChange('guaranteeMonths', e.target.value)}
                            className={errors.guaranteeMonths ? 'border-destructive' : ''}
                          />
                          <FieldError message={errors.guaranteeMonths} />
                        </div>
                      </FormSection>
                      <FormSection
                        title="Załączniki"
                        description="Dodaj dokumenty, które zwiększają wiarygodność lub precyzują zakres realizacji."
                      >
                        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3.5">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                            Dokumentacja dodatkowa
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="sm" asChild>
                              <label className="cursor-pointer">
                                <Paperclip className="mr-2 inline h-4 w-4" />
                                Dodaj pliki
                                <input type="file" className="hidden" multiple onChange={handleFileChange} />
                              </label>
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              PDF, DOC, DOCX, JPG, PNG (max. 10 MB / plik, do {MAX_STAGED_FILES} plików)
                            </span>
                          </div>
                          {stagedFiles.length > 0 && (
                            <ul className="mt-3 space-y-2 rounded-xl border bg-card p-3 text-sm">
                              {stagedFiles.map((file, index) => (
                                <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                                  <span className="truncate font-medium text-foreground">{file.name}</span>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeStagedFile(index)}>
                                    Usuń
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </FormSection>
                    </div>
                    <div className="space-y-4">
                      <FormSection
                        title="Opis i podejście"
                        description="Wyjaśnij zakres prac, założenia realizacyjne i to, co wyróżnia Twoją ofertę."
                      >
                        <div>
                          <Label htmlFor="coverLetterJob">Opis i podejście do zgłoszenia *</Label>
                          <Textarea
                            id="coverLetterJob"
                            placeholder="Np. W cenie uwzględniono materiały i utylizację gruzu. Potrzebujemy dostępu do prądu i wody na klatce schodowej. Opisz zakres, terminy i to, co wyróżnia Twoją ofertę."
                            value={applicationForm.coverLetter}
                            onChange={(e) => handleInputChange('coverLetter', e.target.value)}
                            className={`min-h-[176px] resize-y ${errors.coverLetter ? 'border-destructive' : ''}`}
                          />
                          <div className="mt-1 flex items-center justify-between gap-2">
                            {errors.coverLetter ? <FieldError message={errors.coverLetter} /> : <span />}
                            <p className="text-sm text-muted-foreground">{applicationForm.coverLetter.length} znaków</p>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="additionalNotes">Dodatkowe uwagi (opcjonalnie)</Label>
                          <Textarea
                            id="additionalNotes"
                            placeholder="Inne informacje dla zamawiającego…"
                            value={applicationForm.additionalNotes}
                            onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                            className="min-h-[96px] resize-y"
                          />
                        </div>
                      </FormSection>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background/95 px-4 py-4 backdrop-blur sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex max-w-2xl gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-3.5 py-3 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100"
              role="note"
            >
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
              <p className="min-w-0 text-sm leading-relaxed">
                <span className="font-semibold">Oferta jest wiążąca.</span>{' '}
                Po wysłaniu <span className="font-medium">nie można jej edytować</span>. Sprawdź dane przed wysłaniem.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button variant="outline" className="sm:min-w-[110px]" onClick={onClose} disabled={isSubmitting}>
                Anuluj
              </Button>
              <Button type="button" className="min-w-[240px] shadow-sm" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {isTender ? 'Wyślij wiążącą ofertę w przetargu' : 'Wyślij wiążącą ofertę'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JobApplicationModal;
