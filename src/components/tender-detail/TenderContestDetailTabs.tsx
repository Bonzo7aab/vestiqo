'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  Star,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import type { ContestInfo, Job } from '../../types/job';
import { selectionCriteriaTotalWeight } from '../../types/tender-contest';
import { ContestQuestionsTab } from './ContestQuestionsTab';
import {
  getCategoryDisplayName,
  getSubcategoryDisplayName,
} from '../../lib/config/categoryConfig';

interface TenderContestDetailTabsProps {
  job: Job & { contestInfo: ContestInfo };
  allowQuestions?: boolean;
  contestStatus?: string;
  isContestOwner?: boolean;
  isManager?: boolean;
  onQuestionsCountChange?: (count: number) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement | null {
  if (value == null || value === '') return null;
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

export function TenderContestDetailTabs({
  job,
  allowQuestions = true,
  contestStatus,
  isContestOwner = false,
  isManager = false,
  onQuestionsCountChange,
}: TenderContestDetailTabsProps): React.ReactElement {
  const { contestInfo } = job;
  const categoryName = getCategoryDisplayName({
    slug: typeof job.category === 'object' ? job.category?.slug : undefined,
    name: typeof job.category === 'string' ? job.category : job.category?.name,
  });
  const subcategoryName = getSubcategoryDisplayName({
    name: job.subcategory ?? undefined,
    categorySlug: typeof job.category === 'object' ? job.category?.slug : undefined,
  });
  const criteriaWeightSum = selectionCriteriaTotalWeight(contestInfo.selectionCriteria.items);

  return (
    <>
      <TabsContent value="contest-basic">
        <Card>
          <CardContent className="min-w-0 space-y-6 p-6">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold mb-3">Szczegółowy zakres i uwagi</h3>
              <p className="max-w-full break-words text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.description}
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow label="Kategoria" value={categoryName} />
                {job.subcategory ? (
                  <DetailRow label="Podkategoria" value={subcategoryName ?? job.subcategory} />
                ) : null}
                {contestInfo.buildingName ? (
                  <DetailRow label="Nieruchomość" value={contestInfo.buildingName} />
                ) : null}
                {contestInfo.buildingAddress ? (
                  <DetailRow label="Adres" value={contestInfo.buildingAddress} />
                ) : null}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Dokumentacja konkursowa</h3>
              {contestInfo.documents.length > 0 ? (
                <ul className="space-y-2">
                  {contestInfo.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-lg"
                    >
                      <FileText className="w-4 h-4 text-foreground shrink-0" />
                      {doc.url ? (
                        <Link
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {doc.name}
                          <Download className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-sm">{doc.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Brak załączonych dokumentów.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contest-schedule">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Harmonogram
            </h3>
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailRow
                  label="Zakończenie przyjmowania ofert"
                  value={new Date(contestInfo.submissionDeadline).toLocaleString('pl-PL', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                />
                {contestInfo.evaluationDeadline ? (
                  <DetailRow
                    label="Rozstrzygnięcia konkursu"
                    value={new Date(contestInfo.evaluationDeadline).toLocaleDateString('pl-PL', {
                      dateStyle: 'long',
                    })}
                  />
                ) : (
                  <DetailRow label="Rozstrzygnięcia konkursu" value="Nie określono" />
                )}
                {contestInfo.completionDate ? (
                  <DetailRow
                    label="Termin wykonania"
                    value={new Date(contestInfo.completionDate).toLocaleDateString('pl-PL', {
                      dateStyle: 'long',
                    })}
                  />
                ) : (
                  <DetailRow label="Termin wykonania" value="Nie określono" />
                )}
                <DetailRow label="Wizja lokalna" value={contestInfo.siteVisitTypeLabel} />
              </div>
            </div>
            {contestInfo.siteVisitNotes ? (
              <div>
                <h4 className="font-medium mb-2">Informacje o wizji lokalnej</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contestInfo.siteVisitNotes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contest-formal">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-semibold mb-3">Wymogi</h3>
            {contestInfo.formalRequirementLines.length > 0 ? (
              <ul className="space-y-3">
                {contestInfo.formalRequirementLines.map((line, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Zamawiający nie określił dodatkowych wymogów formalnych.
              </p>
            )}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium mb-2">Uwaga dla wykonawców</h4>
                  <p className="text-sm text-muted-foreground">
                    Wszystkie wymagania są obowiązkowe. Brak spełnienia któregokolwiek z wymagań
                    skutkuje odrzuceniem oferty na etapie weryfikacji formalnej.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contest-financial">
        <Card>
          <CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-semibold mb-3">Warunki</h3>

            {contestInfo.selectionCriteria.items.length > 0 ? (
              <div>
                <h4 className="font-medium mb-3">Kryteria wyboru ofert</h4>
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                  <ul className="space-y-2">
                    {contestInfo.selectionCriteria.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-foreground shrink-0" />
                          {item.name}
                        </span>
                        <Badge variant="secondary">{item.weight}%</Badge>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Suma wag: {criteriaWeightSum}%
                  </p>
                </div>
              </div>
            ) : null}

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contestInfo.warrantyPeriod ? (
                  <DetailRow label="Wymagany okres gwarancji" value={contestInfo.warrantyPeriod} />
                ) : null}
                {contestInfo.guaranteePeriod ? (
                  <DetailRow label="Rękojmia" value={contestInfo.guaranteePeriod} />
                ) : null}
                <DetailRow
                  label="Wadium"
                  value={
                    contestInfo.depositRequired
                      ? contestInfo.depositAmount != null
                        ? `${contestInfo.depositAmount.toLocaleString('pl-PL')} PLN`
                        : 'Wymagane'
                      : 'Nie wymagane'
                  }
                />
                <DetailRow label="Termin płatności" value={contestInfo.paymentTermsLabel} />
              </div>
            </div>

            {contestInfo.depositRequired && contestInfo.depositInstructions ? (
              <div>
                <h4 className="font-medium mb-2">Instrukcja wpłaty wadium</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contestInfo.depositInstructions}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <ContestQuestionsTab
        tenderId={job.id}
        allowQuestions={allowQuestions}
        submissionDeadline={contestInfo.submissionDeadline}
        contestStatus={contestStatus}
        isContestOwner={isContestOwner}
        isManager={isManager}
        onQuestionsCountChange={onQuestionsCountChange}
      />
    </>
  );
}

export const CONTEST_TAB_ITEMS = [
  { value: 'contest-basic', label: 'Informacje podstawowe' },
  { value: 'contest-schedule', label: 'Harmonogram' },
  { value: 'contest-formal', label: 'Wymogi' },
  { value: 'contest-financial', label: 'Warunki' },
  { value: 'contest-qa', label: 'Pytania i odpowiedzi' },
] as const;
