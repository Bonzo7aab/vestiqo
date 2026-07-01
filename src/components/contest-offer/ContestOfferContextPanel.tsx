'use client';

import { StorageDocumentLink } from '../storage/StorageDocumentLink';
import { Building2, ChevronDown, FileText, Info, Tag } from 'lucide-react';
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

function ContextSection({
  title,
  children,
  className,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
}): ReactElement {
  return (
    <section className={cn(compact ? 'space-y-1.5' : 'space-y-2', className)}>
      <h4
        className={cn(
          'font-semibold uppercase tracking-wide text-muted-foreground',
          compact ? 'text-[11px]' : 'text-[11px]',
        )}
      >
        {title}
      </h4>
      {children}
    </section>
  );
}

function ContextDetailCard({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}): ReactElement {
  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-background text-foreground',
        compact ? 'px-3 py-2.5 text-sm leading-normal' : 'px-3 py-2.5 text-sm',
      )}
    >
      {children}
    </div>
  );
}

function ContextContent({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}): ReactElement {
  return (
    <div className={cn('text-foreground', compact ? 'space-y-3 text-sm' : 'space-y-4 text-sm')}>
      {children}
    </div>
  );
}

function ContestInfoStepContent({
  description,
  category,
  subcategory,
  contestInfo,
}: Omit<ContestOfferContextPanelProps, 'currentStep'>): ReactElement {
  const hasMeta = Boolean(category || subcategory || contestInfo.entityName || contestInfo.entityAddress);

  return (
    <ContextContent compact>
      {(description || hasMeta) && (
        <ContextDetailCard compact>
          <div className="space-y-2.5">
            {description ? (
              <p className="line-clamp-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : (
              <p className="leading-relaxed text-muted-foreground">
                Przeczytaj dokumentację konkursu przed złożeniem oferty.
              </p>
            )}

            {(category || subcategory) && (
              <div className="flex flex-wrap items-center gap-2">
                {category ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-xs font-medium text-foreground">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    {category}
                  </span>
                ) : null}
                {subcategory ? (
                  <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
                    {subcategory}
                  </span>
                ) : null}
              </div>
            )}

            {contestInfo.entityName || contestInfo.entityAddress ? (
              <p className="flex min-w-0 items-start gap-2 text-muted-foreground">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 leading-snug">
                  {contestInfo.entityName ? (
                    <span className="font-medium text-foreground">{contestInfo.entityName}</span>
                  ) : null}
                  {contestInfo.entityName && contestInfo.entityAddress ? (
                    <span className="text-muted-foreground"> · </span>
                  ) : null}
                  {contestInfo.entityAddress ? (
                    <span>{contestInfo.entityAddress}</span>
                  ) : null}
                </span>
              </p>
            ) : null}
          </div>
        </ContextDetailCard>
      )}

      {contestInfo.documents.length > 0 ? (
        <ContextSection title="Dokumentacja" compact>
          <ul className="overflow-hidden rounded-md border border-border/60 bg-background">
            {contestInfo.documents.map((doc) => (
              <li key={doc.id} className="border-t border-border/50 first:border-t-0">
                <StorageDocumentLink
                  name={doc.name}
                  path={doc.path}
                  url={doc.url}
                  className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-muted/30 hover:underline disabled:opacity-50"
                  leadingIcon={<FileText className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />}
                />
              </li>
            ))}
          </ul>
        </ContextSection>
      ) : null}
    </ContextContent>
  );
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
      className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm"
    >
      <CollapsibleTrigger
        className={cn(
          'group flex w-full items-center justify-between gap-2 px-3.5 py-2.5',
          'text-sm font-semibold text-[hsl(var(--brand-navy))]',
          'transition-colors hover:bg-muted/25',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-border focus-visible:ring-inset',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary/8">
            <Info className="h-3.5 w-3.5 text-primary" aria-hidden />
          </span>
          <span className="truncate text-left">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <span className="group-data-[state=open]:hidden">Szczegóły</span>
          <span className="hidden group-data-[state=open]:inline">Zwiń</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/60 bg-muted/15 px-3.5 py-3">
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
      <ContestInfoStepContent
        description={description}
        category={category}
        subcategory={subcategory}
        contestInfo={contestInfo}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <ContextContent>
        <ContextSection title="Terminy">
          <ContextDetailCard>
            <p>
              Oferty przyjmowane są do:{' '}
              <span className="font-semibold text-[hsl(var(--brand-navy))]">
                {new Date(contestInfo.submissionDeadline).toLocaleString('pl-PL', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </span>
            </p>
            {contestInfo.completionDate ? (
              <p className="mt-2">
                Preferowany termin zakończenia prac:{' '}
                <span className="font-semibold text-[hsl(var(--brand-navy))]">
                  {new Date(contestInfo.completionDate).toLocaleDateString('pl-PL', {
                    dateStyle: 'long',
                  })}
                </span>
              </p>
            ) : null}
          </ContextDetailCard>
        </ContextSection>
        <ContextSection title="Wizja lokalna">
          <ContextDetailCard>
            <p className="font-medium">{contestInfo.siteVisitTypeLabel}</p>
            {contestInfo.siteVisitNotes ? (
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {contestInfo.siteVisitNotes}
              </p>
            ) : null}
          </ContextDetailCard>
        </ContextSection>
      </ContextContent>
    );
  }

  if (currentStep === 3) {
    return (
      <ContextContent>
        <ContextSection title="Wymagane dokumenty">
          {contestInfo.formalRequirementLines.length > 0 ? (
            <ul className="space-y-1.5 rounded-md border border-border/60 bg-background px-3 py-2.5 text-muted-foreground">
              {contestInfo.formalRequirementLines.map((line) => (
                <li key={line} className="flex gap-2 leading-relaxed">
                  <span className="text-primary" aria-hidden>
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ContextDetailCard>
              <p className="text-muted-foreground">
                Uzupełnij wymagane dokumenty zgodnie z regulaminem konkursu.
              </p>
            </ContextDetailCard>
          )}
        </ContextSection>
      </ContextContent>
    );
  }

  const criteriaItems = contestInfo.selectionCriteria.items;

  return (
    <ContextContent>
      {criteriaItems.length > 0 ? (
        <ContextSection title="Kryteria oceny ofert">
          <ul className="overflow-hidden rounded-md border border-border/60 bg-background divide-y divide-border/60">
            {criteriaItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-medium">{item.name}</span>
                {item.weight != null ? (
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {item.weight}%
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </ContextSection>
      ) : null}
      {(contestInfo.depositRequired ||
        (contestInfo.paymentTerms.mode === 'custom' &&
          (contestInfo.paymentTerms.customDays ?? 0) > 14) ||
        contestInfo.warrantyPeriod ||
        contestInfo.guaranteePeriod) && (
        <ContextSection title="Warunki finansowe">
          <ContextDetailCard>
            {contestInfo.depositRequired ? (
              <div className="mb-2 last:mb-0">
                {contestInfo.depositAmount != null ? (
                  <p>
                    Wadium:{' '}
                    <span className="font-semibold text-[hsl(var(--brand-navy))]">
                      {contestInfo.depositAmount.toLocaleString('pl-PL')} zł
                    </span>
                  </p>
                ) : (
                  <p className="font-medium">Wadium jest wymagane</p>
                )}
                {contestInfo.depositInstructions ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {contestInfo.depositInstructions}
                  </p>
                ) : null}
              </div>
            ) : null}
            {contestInfo.paymentTerms.mode === 'custom' &&
            (contestInfo.paymentTerms.customDays ?? 0) > 14 ? (
              <p>
                Termin płatności faktury:{' '}
                <span className="font-semibold">{contestInfo.paymentTerms.customDays} dni</span>
              </p>
            ) : null}
            {contestInfo.warrantyPeriod ? (
              <p>
                Minimalny okres gwarancji:{' '}
                <span className="font-semibold">{contestInfo.warrantyPeriod}</span>
              </p>
            ) : null}
            {contestInfo.guaranteePeriod ? (
              <p>
                Minimalny okres rękojmi:{' '}
                <span className="font-semibold">{contestInfo.guaranteePeriod}</span>
              </p>
            ) : null}
          </ContextDetailCard>
        </ContextSection>
      )}
      {!criteriaItems.length &&
      !contestInfo.depositRequired &&
      !contestInfo.warrantyPeriod &&
      !contestInfo.guaranteePeriod ? (
        <ContextDetailCard>
          <p className="text-muted-foreground">Podaj wycenę oraz okresy gwarancji i rękojmi.</p>
        </ContextDetailCard>
      ) : null}
    </ContextContent>
  );
}
