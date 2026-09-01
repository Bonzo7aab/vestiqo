'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  MapPin,
  Scale,
  Wallet,
} from 'lucide-react';
import { StorageDocumentLink } from '../storage/StorageDocumentLink';
import { TabsContent } from '../ui/tabs';
import type { ContestInfo, Job } from '../../types/job';
import { selectionCriteriaTotalWeight } from '../../types/tender-contest';
import { ContestQuestionsTab } from './ContestQuestionsTab';
import {
  getCategoryDisplayName,
  getSubcategoryDisplayName,
} from '../../lib/config/categoryConfig';
import { routes } from '../../lib/routes';
import { ContestScheduleTimeline } from './ContestScheduleTimeline';
import {
  ContestDetailCallout,
  ContestDetailChecklist,
  ContestDetailCriteriaList,
  ContestDetailDocumentItem,
  ContestDetailDocumentList,
  ContestDetailEmptyState,
  ContestDetailField,
  ContestDetailFieldGrid,
  ContestDetailProse,
  ContestDetailSection,
  ContestDetailTabPanel,
} from './ContestDetailTabLayout';

interface TenderContestDetailTabsProps {
  job: Job & { contestInfo: ContestInfo };
  allowQuestions?: boolean;
  contestStatus?: string;
  isContestOwner?: boolean;
  isManager?: boolean;
  onQuestionsCountChange?: (count: number) => void;
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
      <TabsContent value="contest-basic" className="mt-0 focus-visible:outline-none">
        <ContestDetailTabPanel>
          <ContestDetailSection
            icon={ClipboardList}
            title="Szczegółowy zakres i uwagi"
            description="Opis prac oraz informacje przekazane przez zamawiającego."
          >
            {job.description?.trim() ? (
              <ContestDetailProse>{job.description}</ContestDetailProse>
            ) : (
              <ContestDetailEmptyState>Brak opisu konkursu.</ContestDetailEmptyState>
            )}
          </ContestDetailSection>

          <ContestDetailSection
            icon={Building2}
            title="Informacje o obiekcie"
            description="Kategoria usługi i dane wspólnoty lub spółdzielni."
          >
            <ContestDetailFieldGrid>
              <ContestDetailField label="Kategoria" value={categoryName} />
              {job.subcategory ? (
                <ContestDetailField
                  label="Podkategoria"
                  value={subcategoryName ?? job.subcategory}
                />
              ) : null}
              {contestInfo.entityName ? (
                <ContestDetailField
                  label="Nieruchomość"
                  value={
                    contestInfo.managedEntityId ? (
                      <Link
                        href={routes.uzytkownik(contestInfo.managedEntityId)}
                        className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {contestInfo.entityName}
                      </Link>
                    ) : (
                      contestInfo.entityName
                    )
                  }
                />
              ) : null}
              {contestInfo.entityAddress ? (
                <ContestDetailField label="Adres obiektu" value={contestInfo.entityAddress} />
              ) : null}
            </ContestDetailFieldGrid>
          </ContestDetailSection>

          <ContestDetailSection
            icon={FileText}
            title="Dokumentacja konkursowa"
            description="Materiały do pobrania i zapoznania przed złożeniem oferty."
          >
            {contestInfo.documents.length > 0 ? (
              <ContestDetailDocumentList>
                {contestInfo.documents.map((doc) => (
                  <ContestDetailDocumentItem key={doc.id}>
                    <StorageDocumentLink
                      name={doc.name}
                      path={doc.path}
                      url={doc.url}
                      className="w-full flex-1"
                      leadingIcon={
                        <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      }
                    />
                  </ContestDetailDocumentItem>
                ))}
              </ContestDetailDocumentList>
            ) : (
              <ContestDetailEmptyState>Brak załączonych dokumentów.</ContestDetailEmptyState>
            )}
          </ContestDetailSection>
        </ContestDetailTabPanel>
      </TabsContent>

      <TabsContent value="contest-schedule" className="mt-0 focus-visible:outline-none">
        <ContestDetailTabPanel>
          <ContestDetailSection
            icon={CalendarClock}
            title="Harmonogram konkursu"
            description="Kluczowe terminy obowiązujące wykonawców."
          >
            <ContestScheduleTimeline
              publishedAt={contestInfo.publishedAt}
              submissionDeadline={contestInfo.submissionDeadline}
              evaluationDeadline={contestInfo.evaluationDeadline}
              completionDate={contestInfo.completionDate}
              contestStatus={contestStatus}
            />
          </ContestDetailSection>

          <ContestDetailSection
            icon={MapPin}
            title="Wizja lokalna"
            description="Informacje o obowiązkowej lub opcjonalnej wizycie na obiekcie."
          >
            <ContestDetailField label="Status wizji" value={contestInfo.siteVisitTypeLabel} />
            {contestInfo.siteVisitNotes ? (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Dodatkowe informacje
                </p>
                <ContestDetailProse>{contestInfo.siteVisitNotes}</ContestDetailProse>
              </div>
            ) : null}
          </ContestDetailSection>
        </ContestDetailTabPanel>
      </TabsContent>

      <TabsContent value="contest-formal" className="mt-0 focus-visible:outline-none">
        <ContestDetailTabPanel>
          <ContestDetailSection
            icon={Scale}
            title="Wymogi formalne"
            description="Warunki, które oferta musi spełnić na etapie weryfikacji."
          >
            {contestInfo.formalRequirementLines.length > 0 ? (
              <ContestDetailChecklist items={contestInfo.formalRequirementLines} />
            ) : (
              <ContestDetailEmptyState>
                Zamawiający nie określił dodatkowych wymogów formalnych.
              </ContestDetailEmptyState>
            )}
          </ContestDetailSection>

          <ContestDetailCallout
            icon={AlertTriangle}
            title="Uwaga dla wykonawców"
            variant="warning"
          >
            Wszystkie wymagania są obowiązkowe. Brak spełnienia któregokolwiek z wymagań skutkuje
            odrzuceniem oferty na etapie weryfikacji formalnej.
          </ContestDetailCallout>
        </ContestDetailTabPanel>
      </TabsContent>

      <TabsContent value="contest-financial" className="mt-0 focus-visible:outline-none">
        <ContestDetailTabPanel>
          {contestInfo.selectionCriteria.items.length > 0 ? (
            <ContestDetailSection
              icon={Scale}
              title="Kryteria wyboru ofert"
              description="Wagi stosowane przy ocenie i porównaniu ofert."
            >
              <ContestDetailCriteriaList
                items={contestInfo.selectionCriteria.items}
                totalWeight={criteriaWeightSum}
              />
            </ContestDetailSection>
          ) : null}

          <ContestDetailSection
            icon={Wallet}
            title="Warunki finansowe i gwarancyjne"
            description="Wadium, płatności oraz okresy gwarancji i rękojmi."
          >
            <ContestDetailFieldGrid>
              {contestInfo.warrantyPeriod ? (
                <ContestDetailField
                  label="Wymagany okres gwarancji"
                  value={contestInfo.warrantyPeriod}
                />
              ) : null}
              {contestInfo.guaranteePeriod ? (
                <ContestDetailField label="Rękojmia" value={contestInfo.guaranteePeriod} />
              ) : null}
              <ContestDetailField
                label="Wadium"
                value={
                  contestInfo.depositRequired
                    ? contestInfo.depositAmount != null
                      ? `${contestInfo.depositAmount.toLocaleString('pl-PL')} PLN`
                      : 'Wymagane'
                    : 'Nie wymagane'
                }
              />
              <ContestDetailField label="Termin płatności" value={contestInfo.paymentTermsLabel} />
            </ContestDetailFieldGrid>

            {contestInfo.depositRequired && contestInfo.depositInstructions ? (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Instrukcja wpłaty wadium
                </p>
                <ContestDetailProse>{contestInfo.depositInstructions}</ContestDetailProse>
              </div>
            ) : null}
          </ContestDetailSection>
        </ContestDetailTabPanel>
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
  { value: 'contest-basic', label: 'Informacje podstawowe', shortLabel: 'Informacje' },
  { value: 'contest-schedule', label: 'Harmonogram', shortLabel: 'Harmonogram' },
  { value: 'contest-formal', label: 'Wymogi', shortLabel: 'Wymogi' },
  { value: 'contest-financial', label: 'Warunki', shortLabel: 'Warunki' },
  { value: 'contest-qa', label: 'Pytania i odpowiedzi', shortLabel: 'Pytania' },
] as const;
