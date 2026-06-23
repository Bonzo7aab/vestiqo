'use client';

import { StorageDocumentLink } from '../storage/StorageDocumentLink';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  FileText,
  Star,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import type { ContestDisplayInfo } from '../../lib/contest/map-tender-contest-display';
import type { TenderWithCompany } from '../../lib/database/jobs';
import { selectionCriteriaTotalWeight } from '../../types/tender-contest';
import { formatSubmissionDeadlineDisplay } from '../../lib/contest-submission-deadline';

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): ReactElement | null {
  if (value == null || value === '') return null;
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

interface ManagerContestDetailSectionsProps {
  tender: TenderWithCompany;
  contestInfo: ContestDisplayInfo;
}

export function ManagerContestDetailSections({
  tender,
  contestInfo,
}: ManagerContestDetailSectionsProps): ReactElement {
  const categoryName = tender.category?.name ?? 'Inne';
  const subcategoryName = tender.subcategory?.name;
  const criteriaWeightSum = selectionCriteriaTotalWeight(contestInfo.selectionCriteria.items);
  const deadlineDisplay = tender.submission_deadline
    ? formatSubmissionDeadlineDisplay(tender.submission_deadline)
    : null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-base font-semibold">Szczegółowy zakres i uwagi</h3>
        {tender.description ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tender.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Brak opisu.</p>
        )}
        <div className="rounded-lg border bg-muted/40 p-4 grid gap-3 sm:grid-cols-2">
          <DetailRow label="Kategoria" value={categoryName} />
          {subcategoryName ? <DetailRow label="Podkategoria" value={subcategoryName} /> : null}
          {contestInfo.buildingName ? (
            <DetailRow label="Nieruchomość" value={contestInfo.buildingName} />
          ) : null}
          {contestInfo.buildingAddress ? (
            <DetailRow label="Adres" value={contestInfo.buildingAddress} />
          ) : null}
          {tender.estimated_value != null ? (
            <DetailRow
              label="Szacowana wartość"
              value={new Intl.NumberFormat('pl-PL', {
                style: 'currency',
                currency: tender.currency || 'PLN',
                maximumFractionDigits: 0,
              }).format(tender.estimated_value)}
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Dokumentacja konkursowa</h3>
        {contestInfo.documents.length > 0 ? (
          <ul className="space-y-2">
            {contestInfo.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <StorageDocumentLink name={doc.name} path={doc.path} url={doc.url} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Brak załączonych dokumentów.</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Harmonogram
        </h3>
        <div className="rounded-lg border bg-muted/40 p-4 grid gap-3 sm:grid-cols-2">
          <DetailRow
            label="Zakończenie przyjmowania ofert"
            value={
              deadlineDisplay
                ? `${deadlineDisplay.formatted}${deadlineDisplay.hint ? ` (${deadlineDisplay.hint})` : ''}`
                : null
            }
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
        {contestInfo.siteVisitNotes ? (
          <div>
            <h4 className="text-sm font-medium mb-1">Informacje o wizji lokalnej</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contestInfo.siteVisitNotes}
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Wymogi</h3>
        {contestInfo.formalRequirementLines.length > 0 ? (
          <ul className="space-y-2">
            {contestInfo.formalRequirementLines.map((line) => (
              <li key={line} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Zamawiający nie określił dodatkowych wymogów formalnych.
          </p>
        )}
        <div className="rounded-lg border p-3 flex gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Wszystkie wymagania są obowiązkowe. Brak spełnienia któregokolwiek z wymagań skutkuje
            odrzuceniem oferty na etapie weryfikacji formalnej.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">Warunki</h3>

        {contestInfo.selectionCriteria.items.length > 0 ? (
          <div>
            <h4 className="text-sm font-medium mb-2">Kryteria wyboru ofert</h4>
            <ul className="space-y-2 rounded-lg border bg-muted/40 p-4">
              {contestInfo.selectionCriteria.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4 shrink-0" />
                    {item.name}
                  </span>
                  <span className="text-muted-foreground font-medium">{item.weight}%</span>
                </li>
              ))}
              <li className="text-xs text-muted-foreground pt-2 border-t">
                Suma wag: {criteriaWeightSum}%
              </li>
            </ul>
          </div>
        ) : null}

        <div className="rounded-lg border bg-muted/40 p-4 grid gap-3 sm:grid-cols-2">
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

        {contestInfo.depositRequired && contestInfo.depositInstructions ? (
          <div>
            <h4 className="text-sm font-medium mb-1">Instrukcja wpłaty wadium</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contestInfo.depositInstructions}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
