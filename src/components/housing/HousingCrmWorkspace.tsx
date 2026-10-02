'use client';

import { ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ManagedBuildingEditor } from '../ManagedBuildingEditor';
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import { formatBuildingAddressLine } from '../../lib/database/condo-board-housing';
import {
  countBuildingsNeedingAttention,
  worstStatusForBuildings,
} from '../../lib/housing/inspection-summary';
import { HousingAlerts } from './HousingAlerts';
import { HousingAddChildDialog } from './HousingAddChildDialog';
import { HousingAddEntityDialog } from './HousingAddEntityDialog';
import { HousingDeleteEntityDialog } from './HousingDeleteEntityDialog';
import { HousingDirectoryRow } from './HousingDirectoryRow';
import { HousingSectionHeader } from './HousingSectionHeader';
import { HousingSummaryStrip } from './HousingSummaryStrip';
import { InspectionStatusBadge } from './InspectionStatusBadge';
import type { ManagedHousingWorkspace } from './useManagedHousingWorkspace';
import { isManagedHousingEntityBlocked } from '../../types/managed-housing-entity';

interface HousingCrmWorkspaceProps {
  copy: ManagedHousingUiCopy;
  workspace: ManagedHousingWorkspace;
}

function Breadcrumb({ items }: { items: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <nav
      aria-label="Ścieżka"
      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-foreground hover:underline"
              >
                {item.label}
              </button>
            ) : (
              <span>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function buildingMeta(building: {
  total_residential_units: number | null;
  above_ground_floors: number | null;
}): string {
  const parts: string[] = [];
  if (building.total_residential_units != null) {
    parts.push(
      `${building.total_residential_units} ${building.total_residential_units === 1 ? 'lokal' : 'lokali'}`,
    );
  }
  if (building.above_ground_floors != null) {
    parts.push(`${building.above_ground_floors} kond.`);
  }
  return parts.join(' · ') || '—';
}

export function HousingCrmWorkspace({ copy, workspace }: HousingCrmWorkspaceProps) {
  const {
    filteredEntities,
    entities,
    buildingCounts,
    buildingIdsByEntityId,
    portfolioInspectionsByBuildingId,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    success,
    selectedEntity,
    selectedBuilding,
    setSelectedBuilding,
    selectEntity,
    openAddDialog,
    setDeletingEntity,
    setIsDeleteDialogOpen,
    basicsForm,
    setBasicsForm,
    isSubmitting,
    handleSaveBasics,
    buildings,
    inspectionsByBuildingId,
    isLoadingBuildings,
    setIsAddBuildingOpen,
    onBuildingUpdated,
    onBuildingDeleted,
  } = workspace;

  if (selectedEntity && selectedBuilding) {
    return (
      <div className="space-y-6" id="nieruchomosci">
        <HousingAlerts error={error} success={success} />
        <Breadcrumb
          items={[
            { label: copy.listRootLabel, onClick: () => selectEntity(null) },
            { label: selectedEntity.name, onClick: () => setSelectedBuilding(null) },
            { label: selectedBuilding.name },
          ]}
        />
        <ManagedBuildingEditor
          building={selectedBuilding}
          grouped
          onUpdated={onBuildingUpdated}
          onDeleted={onBuildingDeleted}
          onClose={() => setSelectedBuilding(null)}
        />
      </div>
    );
  }

  if (selectedEntity) {
    const entityBlocked = isManagedHousingEntityBlocked(selectedEntity);
    return (
      <div className="space-y-5" id="nieruchomosci">
        <HousingAlerts error={error} success={success} />
        <Breadcrumb
          items={[
            { label: copy.listRootLabel, onClick: () => selectEntity(null) },
            { label: selectedEntity.name },
          ]}
        />

        <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-2xl font-semibold tracking-tight">{selectedEntity.name}</h2>
            <p className="text-sm text-muted-foreground">
              NIP {selectedEntity.nip}
              {' · '}
              {formatBuildingAddressLine(selectedEntity)}
            </p>
            {isManagedHousingEntityBlocked(selectedEntity) ? (
              <p className="text-sm text-amber-700">
                Wspólnota odzyskała własne konto. Rekord pozostaje do historii konkursów i nie można go edytować.
              </p>
            ) : null}
          </div>
          {isManagedHousingEntityBlocked(selectedEntity) ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit text-muted-foreground hover:text-destructive"
            onClick={() => {
              setDeletingEntity(selectedEntity);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {copy.deleteEntity}
          </Button>
          )}
        </div>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-sm font-medium">Dane wspólnoty</CardTitle>
            <p className="text-sm text-muted-foreground">{copy.basicsHint}</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>NIP</Label>
                <Input value={basicsForm.nip} disabled />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Nazwa</Label>
                <Input
                  value={basicsForm.name}
                  onChange={(e) =>
                    setBasicsForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={entityBlocked}
                />
              </div>
              <div className="space-y-2">
                <Label>REGON</Label>
                <Input
                  value={basicsForm.regon}
                  onChange={(e) =>
                    setBasicsForm((prev) => ({ ...prev, regon: e.target.value }))
                  }
                  disabled={entityBlocked}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adres</Label>
                <Input
                  value={basicsForm.address}
                  onChange={(e) =>
                    setBasicsForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  disabled={entityBlocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Miasto</Label>
                <Input
                  value={basicsForm.city}
                  onChange={(e) =>
                    setBasicsForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  disabled={entityBlocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Kod pocztowy</Label>
                <Input
                  value={basicsForm.postal_code}
                  onChange={(e) =>
                    setBasicsForm((prev) => ({ ...prev, postal_code: e.target.value }))
                  }
                  disabled={entityBlocked}
                />
              </div>
            </div>
            {entityBlocked ? null : (
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleSaveBasics()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {copy.saveBasicsLabel}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">
                {copy.childTab}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {buildings.length}
                </span>
              </h3>
              <p className="text-sm text-muted-foreground">{copy.childIntro}</p>
            </div>
            {entityBlocked ? null : (
              <Button type="button" size="sm" onClick={() => setIsAddBuildingOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {copy.addChild}
              </Button>
            )}
          </div>

          {isLoadingBuildings ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : buildings.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-12 text-center">
              <p className="text-sm font-medium">{copy.emptyChildrenTitle}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {copy.emptyChildren}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {buildings.map((building) => (
                <HousingDirectoryRow
                  key={building.id}
                  title={formatBuildingAddressLine(building)}
                  subtitle={building.name}
                  meta={buildingMeta(building)}
                  badge={
                    <InspectionStatusBadge inspections={inspectionsByBuildingId[building.id]} />
                  }
                  onClick={() => setSelectedBuilding(building)}
                />
              ))}
            </div>
          )}
        </section>

        <HousingAddChildDialog copy={copy} workspace={workspace} />
        <HousingDeleteEntityDialog copy={copy} workspace={workspace} includeChildren />
      </div>
    );
  }

  return (
    <div className="space-y-5" id="nieruchomosci">
      <HousingAlerts error={error} success={success} />

      <HousingSectionHeader
        title={copy.sectionTitle}
        description={copy.listIntro}
        count={entities.length}
        countOne={copy.listCountOne}
        countMany={copy.listCountMany}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={copy.searchPlaceholder}
        showSearch={entities.length > 0}
        action={
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {copy.addEntity}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entities.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="text-sm font-medium">{copy.emptyListTitle}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{copy.emptyList}</p>
          <Button className="mt-5" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {copy.addEntity}
          </Button>
        </div>
      ) : (
        <>
          <HousingSummaryStrip
            items={[
              { label: copy.listRootLabel, value: entities.length },
              {
                label: copy.childCountColumn,
                value: Object.values(buildingCounts).reduce((sum, count) => sum + count, 0),
              },
              {
                label: 'Wymagają uwagi',
                value: countBuildingsNeedingAttention(
                  Object.values(buildingIdsByEntityId).flat(),
                  portfolioInspectionsByBuildingId,
                ),
              },
            ]}
          />
          {filteredEntities.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">Brak wyników dla podanego wyszukiwania.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntities.map((entity) => {
                const buildingIds = buildingIdsByEntityId[entity.id] ?? [];
                const propertyCount = buildingCounts[entity.id] ?? 0;
                return (
                  <HousingDirectoryRow
                    key={entity.id}
                    title={entity.name}
                    subtitle={`NIP ${entity.nip} · ${formatBuildingAddressLine(entity)}`}
                    meta={
                      isManagedHousingEntityBlocked(entity)
                        ? 'Wspólnota odzyskała własne konto'
                        : `${propertyCount} ${propertyCount === 1 ? 'nieruchomość' : 'nieruchomości'}`
                    }
                    badge={
                      propertyCount > 0 ? (
                        <InspectionStatusBadge
                          status={worstStatusForBuildings(
                            buildingIds,
                            portfolioInspectionsByBuildingId,
                          )}
                        />
                      ) : undefined
                    }
                    action={
                      isManagedHousingEntityBlocked(entity) ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={copy.deleteEntity}
                          onClick={() => {
                            setDeletingEntity(entity);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )
                    }
                    onClick={() => selectEntity(entity)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      <HousingAddEntityDialog
        copy={copy}
        workspace={workspace}
        description="Podaj NIP wspólnoty mieszkaniowej — dane zostaną pobrane z rejestru GUS."
        nipLabel={copy.nipFieldLabel}
      />
      <HousingDeleteEntityDialog copy={copy} workspace={workspace} includeChildren={false} />
    </div>
  );
}
