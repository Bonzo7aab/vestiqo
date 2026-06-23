'use client';

import { StorageDocumentLink } from '../storage/StorageDocumentLink';
import { ChevronDown, FileText, Info } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import type { ContestInfo } from '../../types/job';
import type { ContestOfferWizardStep } from '../../lib/database/contest-offers';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { cn } from '../ui/utils';

interface ContestOfferContextPanelProps {
  currentStep: ContestOfferWizardStep;
  description: string;
  category?: string;
  subcategory?: string;
  contestInfo: ContestInfo;
}

const STEP_CONTEXT_TITLES: Record<ContestOfferWizardStep, string> = {
  1: 'Informacje o konkursie',
  2: 'Harmonogram konkursu',
  3: 'Wymogi formalne konkursu',
  4: 'Warunki finansowe konkursu',
};

function ContextContent({ children }: { children: ReactNode }): ReactElement {
  return <div className="space-y-2 text-sm text-foreground/90">{children}</div>;
}

export function ContestOfferContextPanel({
  currentStep,
  description,
  category,
  subcategory,
  contestInfo,
}: ContestOfferContextPanelProps): ReactElement {
  const title = STEP_CONTEXT_TITLES[currentStep];

  return (
    <Collapsible
      key={currentStep}
      defaultOpen={false}
      className="border-t bg-muted/20 -mx-6 px-6 pt-4 data-[state=open]:pb-0"
    >
      <CollapsibleTrigger
        className={cn(
          'group flex h-11 w-full items-center justify-between gap-3',
          'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
          'hover:text-foreground transition-colors',
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium normal-case tracking-normal">
          <span className="group-data-[state=open]:hidden">Rozwiń</span>
          <span className="hidden group-data-[state=open]:inline">Zwiń</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-3 pt-0">
        {renderContextContent(currentStep, {
          description,
          category,
          subcategory,
          contestInfo,
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function renderContextContent(
  currentStep: ContestOfferWizardStep,
  props: Omit<ContestOfferContextPanelProps, 'currentStep'>,
): ReactElement {
  const { description, category, subcategory, contestInfo } = props;

  if (currentStep === 1) {
    return (
      <ContextContent>
        {description ? (
          <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
        ) : (
          <p className="text-muted-foreground">
            Przeczytaj dokumentację konkursu przed złożeniem oferty.
          </p>
        )}
        {(category || subcategory) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {category ? (
              <span>
                <span className="text-muted-foreground">Kategoria: </span>
                <span className="font-medium">{category}</span>
              </span>
            ) : null}
            {subcategory ? (
              <span>
                <span className="text-muted-foreground">Podkategoria: </span>
                <span className="font-medium">{subcategory}</span>
              </span>
            ) : null}
          </div>
        )}
        {contestInfo.buildingName || contestInfo.buildingAddress ? (
          <div>
            {contestInfo.buildingName ? (
              <p className="font-medium">{contestInfo.buildingName}</p>
            ) : null}
            {contestInfo.buildingAddress ? (
              <p className="text-muted-foreground">{contestInfo.buildingAddress}</p>
            ) : null}
          </div>
        ) : null}
        {contestInfo.documents.length > 0 ? (
          <ul className="space-y-1">
            {contestInfo.documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <StorageDocumentLink
                  name={doc.name}
                  path={doc.path}
                  url={doc.url}
                  className="text-primary hover:underline truncate text-left"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </ContextContent>
    );
  }

  if (currentStep === 2) {
    return (
      <ContextContent>
        <p>
          Oferty przyjmowane są do:{' '}
          <span className="font-medium">
            {new Date(contestInfo.submissionDeadline).toLocaleString('pl-PL', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </span>
        </p>
        {contestInfo.completionDate ? (
          <p>
            Preferowany termin zakończenia prac:{' '}
            <span className="font-medium">
              {new Date(contestInfo.completionDate).toLocaleDateString('pl-PL', {
                dateStyle: 'long',
              })}
            </span>
          </p>
        ) : null}
        <div>
          <p className="text-muted-foreground">Wizja lokalna</p>
          <p className="font-medium">{contestInfo.siteVisitTypeLabel}</p>
          {contestInfo.siteVisitNotes ? (
            <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
              {contestInfo.siteVisitNotes}
            </p>
          ) : null}
        </div>
      </ContextContent>
    );
  }

  if (currentStep === 3) {
    return (
      <ContextContent>
        {contestInfo.formalRequirementLines.length > 0 ? (
          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
            {contestInfo.formalRequirementLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Uzupełnij wymagane dokumenty zgodnie z regulaminem konkursu.
          </p>
        )}
      </ContextContent>
    );
  }

  const criteriaItems = contestInfo.selectionCriteria.items;

  return (
    <ContextContent>
      {criteriaItems.length > 0 ? (
        <div>
          <p className="text-muted-foreground mb-1">Kryteria oceny ofert</p>
          <ul className="space-y-0.5">
            {criteriaItems.map((item) => (
              <li key={item.id}>
                <span className="font-medium">{item.name}</span>
                {item.weight != null ? (
                  <span className="text-muted-foreground"> — {item.weight}%</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {contestInfo.depositRequired ? (
        <div>
          {contestInfo.depositAmount != null ? (
            <p>
              Wadium:{' '}
              <span className="font-medium">
                {contestInfo.depositAmount.toLocaleString('pl-PL')} zł
              </span>
            </p>
          ) : (
            <p className="font-medium">Wadium jest wymagane</p>
          )}
          {contestInfo.depositInstructions ? (
            <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
              {contestInfo.depositInstructions}
            </p>
          ) : null}
        </div>
      ) : null}
      {contestInfo.paymentTerms.mode === 'custom' &&
      (contestInfo.paymentTerms.customDays ?? 0) > 14 ? (
        <p>
          Wymagany termin płatności faktury:{' '}
          <span className="font-medium">{contestInfo.paymentTerms.customDays} dni</span>
        </p>
      ) : null}
      {contestInfo.warrantyPeriod ? (
        <p>
          Minimalny okres gwarancji:{' '}
          <span className="font-medium">{contestInfo.warrantyPeriod}</span>
        </p>
      ) : null}
      {contestInfo.guaranteePeriod ? (
        <p>
          Minimalny okres rękojmi:{' '}
          <span className="font-medium">{contestInfo.guaranteePeriod}</span>
        </p>
      ) : null}
      {!criteriaItems.length &&
      !contestInfo.depositRequired &&
      !contestInfo.warrantyPeriod &&
      !contestInfo.guaranteePeriod ? (
        <p className="text-muted-foreground">Podaj wycenę oraz okresy gwarancji i rękojmi.</p>
      ) : null}
    </ContextContent>
  );
}
