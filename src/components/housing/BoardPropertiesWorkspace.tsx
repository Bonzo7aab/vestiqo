'use client';

import { Loader2, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ManagedBuildingEditor } from '../ManagedBuildingEditor';
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import { formatBuildingAddressLine } from '../../lib/database/condo-board-housing';
import { HousingAlerts } from './HousingAlerts';
import { HousingSectionHeader } from './HousingSectionHeader';
import { InspectionStatusBadge } from './InspectionStatusBadge';
import type { BoardBuildingsWorkspace } from './useBoardBuildingsWorkspace';

interface BoardPropertiesWorkspaceProps {
  copy: ManagedHousingUiCopy;
  workspace: BoardBuildingsWorkspace;
}

function buildingMeta(building: {
  total_residential_units: number | null;
  above_ground_floors: number | null;
}): string {
  const parts: string[] = [];
  if (building.total_residential_units != null) {
    parts.push(`${building.total_residential_units} lok.`);
  }
  if (building.above_ground_floors != null) {
    parts.push(`${building.above_ground_floors} kond.`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function BoardAddBuildingDialog({
  copy,
  workspace,
}: {
  copy: ManagedHousingUiCopy;
  workspace: BoardBuildingsWorkspace;
}) {
  const {
    isAddDialogOpen,
    closeAddDialog,
    addressForm,
    setAddressForm,
    isSubmitting,
    isLookingUpCity,
    handlePostalCodeBlur,
    handleCreateBuildingByAddress,
  } = workspace;

  return (
    <Dialog
      open={isAddDialogOpen}
      onOpenChange={(open) => {
        if (!open) closeAddDialog();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.addChildDialogTitle}</DialogTitle>
          <DialogDescription>{copy.addChildDialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="board-building-address">Ulica i numer *</Label>
            <Input
              id="board-building-address"
              value={addressForm.address}
              onChange={(e) =>
                setAddressForm((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="np. ul. Królewska 12"
              autoComplete="street-address"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="board-building-postal">Kod pocztowy</Label>
              <Input
                id="board-building-postal"
                value={addressForm.postal_code}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, postal_code: e.target.value }))
                }
                onBlur={() => void handlePostalCodeBlur()}
                placeholder="00-000"
                autoComplete="postal-code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-building-city">
                Miasto{isLookingUpCity ? '…' : ''}
              </Label>
              <Input
                id="board-building-city"
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="np. Warszawa"
                autoComplete="address-level2"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-building-name">Nazwa (opcjonalnie)</Label>
            <Input
              id="board-building-name"
              value={addressForm.name}
              onChange={(e) =>
                setAddressForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={copy.addChildNamePlaceholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeAddDialog}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreateBuildingByAddress()}
            disabled={isSubmitting || !addressForm.address.trim()}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BoardPropertiesWorkspace({ copy, workspace }: BoardPropertiesWorkspaceProps) {
  const {
    filteredBuildings,
    buildings,
    inspectionsByBuildingId,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    success,
    selectedBuilding,
    setSelectedBuilding,
    openAddDialog,
    onBuildingUpdated,
    onBuildingDeleted,
  } = workspace;

  if (selectedBuilding) {
    return (
      <div className="space-y-4" id="nieruchomosci">
        <HousingAlerts error={error} success={success} />
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

  return (
    <div className="space-y-5" id="nieruchomosci">
      <HousingAlerts error={error} success={success} />

      <HousingSectionHeader
        title={copy.sectionTitle}
        description={copy.listIntro}
        count={buildings.length}
        countOne={copy.listCountOne}
        countMany={copy.listCountMany}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={copy.searchPlaceholder}
        showSearch={buildings.length > 0}
        action={
          <Button type="button" size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {copy.addEntity}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="sr-only">{copy.loadingList}</span>
        </div>
      ) : buildings.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium">{copy.emptyListTitle}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{copy.emptyList}</p>
          <Button type="button" className="mt-4" size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {copy.addEntity}
          </Button>
        </div>
      ) : filteredBuildings.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">Brak wyników dla podanego wyszukiwania.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adres</TableHead>
                <TableHead>Nazwa</TableHead>
                <TableHead>Lokale / kondygnacje</TableHead>
                <TableHead>Przeglądy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuildings.map((building) => (
                <TableRow
                  key={building.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedBuilding(building)}
                >
                  <TableCell className="font-medium">
                    {formatBuildingAddressLine(building)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {building.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {buildingMeta(building)}
                  </TableCell>
                  <TableCell>
                    <InspectionStatusBadge
                      inspections={inspectionsByBuildingId[building.id]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BoardAddBuildingDialog copy={copy} workspace={workspace} />
    </div>
  );
}
