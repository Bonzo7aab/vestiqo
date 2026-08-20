'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { createClient } from '../lib/supabase/client';
import {
  deleteManagedBuilding,
  fetchBuildingInspections,
  updateManagedBuilding,
  upsertBuildingInspectionDate,
} from '../lib/database/managed-buildings';
import type {
  BuildingInspectionType,
  ChimneyDuctType,
  ManagedBuilding,
  ManagedBuildingFormData,
  ManagedBuildingInspection,
} from '../types/managed-building';
import {
  BUILDING_INSPECTION_DEFINITIONS,
  CHIMNEY_DUCT_TYPE_OPTIONS,
  ROOF_TYPE_OPTIONS,
  buildingToForm,
  computeInspectionStatus,
  inspectionStatusLabel,
} from '../types/managed-building';
import { cn } from './ui/utils';

interface ManagedBuildingEditorProps {
  building: ManagedBuilding;
  onUpdated: (building: ManagedBuilding) => void;
  onDeleted: (buildingId: string) => void;
  onClose: () => void;
}

function statusBadgeClass(status: ReturnType<typeof computeInspectionStatus>): string {
  switch (status) {
    case 'current':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'upcoming':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'overdue':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

export function ManagedBuildingEditor({
  building,
  onUpdated,
  onDeleted,
  onClose,
}: ManagedBuildingEditorProps): ReactElement {
  const [formData, setFormData] = useState<ManagedBuildingFormData>(() =>
    buildingToForm(building),
  );
  const [inspections, setInspections] = useState<ManagedBuildingInspection[]>([]);
  const [isLoadingInspections, setIsLoadingInspections] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFormData(buildingToForm(building));
  }, [building]);

  const loadInspections = useCallback(async () => {
    setIsLoadingInspections(true);
    const supabase = createClient();
    const { data, error: fetchError } = await fetchBuildingInspections(supabase, building.id);
    if (fetchError) {
      setError(fetchError.message || 'Nie udało się wczytać kalendarza przeglądów');
      setInspections([]);
    } else {
      setInspections(data ?? []);
    }
    setIsLoadingInspections(false);
  }, [building.id]);

  useEffect(() => {
    void loadInspections();
  }, [loadInspections]);

  const updateField = <K extends keyof ManagedBuildingFormData>(
    key: K,
    value: ManagedBuildingFormData[K],
  ): void => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleChimneyType = (value: ChimneyDuctType): void => {
    setFormData((prev) => {
      const exists = prev.chimney_duct_types.includes(value);
      return {
        ...prev,
        chimney_duct_types: exists
          ? prev.chimney_duct_types.filter((t) => t !== value)
          : [...prev.chimney_duct_types, value],
      };
    });
  };

  const handleSaveTechnical = async (): Promise<void> => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    const supabase = createClient();
    const { data, error: saveError } = await updateManagedBuilding(
      supabase,
      building.id,
      building.managed_entity_id,
      formData,
    );
    if (saveError || !data) {
      setError(saveError?.message || 'Nie udało się zapisać danych technicznych');
      setIsSaving(false);
      return;
    }
    onUpdated(data);
    setSuccess('Zapisano dane techniczne');
    setIsSaving(false);
  };

  const handleInspectionDateChange = async (
    inspectionType: BuildingInspectionType,
    lastInspectedAt: string,
  ): Promise<void> => {
    setError('');
    const supabase = createClient();
    const { data, error: saveError } = await upsertBuildingInspectionDate(
      supabase,
      building.id,
      inspectionType,
      lastInspectedAt || null,
    );
    if (saveError || !data) {
      setError(saveError?.message || 'Nie udało się zapisać daty przeglądu');
      return;
    }
    setInspections((prev) =>
      prev.map((item) => (item.inspection_type === inspectionType ? data : item)),
    );
  };

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Usunąć budynek „${building.name}"?`)) return;
    setIsDeleting(true);
    setError('');
    const supabase = createClient();
    const { success: deleted, error: deleteError } = await deleteManagedBuilding(
      supabase,
      building.id,
      building.managed_entity_id,
    );
    if (!deleted || deleteError) {
      setError(deleteError?.message || 'Nie udało się usunąć budynku');
      setIsDeleting(false);
      return;
    }
    onDeleted(building.id);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{building.name}</h3>
          <p className="text-sm text-muted-foreground">
            Dane techniczne i kalendarz przeglądów budynku
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Wróć do listy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <Tabs defaultValue="technical" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="technical">Dane Techniczne</TabsTrigger>
          <TabsTrigger value="inspections">Kalendarz Przeglądów</TabsTrigger>
        </TabsList>

        <TabsContent value="technical" className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="building-name">Nazwa / Identyfikator budynku</Label>
            <Input
              id="building-name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder='Np. „Budynek A”, „ul. Królewska 4A”'
            />
          </div>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Gabaryty i konstrukcja budynku</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Liczba kondygnacji nadziemnych</Label>
                <Input
                  inputMode="numeric"
                  value={formData.above_ground_floors}
                  onChange={(e) => updateField('above_ground_floors', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Liczba kondygnacji podziemnych</Label>
                <Input
                  inputMode="numeric"
                  value={formData.below_ground_floors}
                  onChange={(e) => updateField('below_ground_floors', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Powierzchnia dachu (m²)</Label>
                <Input
                  inputMode="decimal"
                  value={formData.roof_area_m2}
                  onChange={(e) => updateField('roof_area_m2', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Typ / Pokrycie dachu</Label>
                <Select
                  value={formData.roof_type || undefined}
                  onValueChange={(value) =>
                    updateField('roof_type', value as ManagedBuildingFormData['roof_type'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOF_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Powierzchnia elewacji (szacunkowa, m²)</Label>
                <Input
                  inputMode="decimal"
                  value={formData.facade_area_m2}
                  onChange={(e) => updateField('facade_area_m2', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Instalacja gazowa budynku</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Liczba lokali z podłączeniem gazowym</Label>
                <Input
                  inputMode="numeric"
                  value={formData.gas_connected_units}
                  onChange={(e) => updateField('gas_connected_units', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Liczba pionów gazowych</Label>
                <Input
                  inputMode="numeric"
                  value={formData.gas_risers_count}
                  onChange={(e) => updateField('gas_risers_count', e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox
                  checked={formData.has_own_gas_boilerroom}
                  onCheckedChange={(checked) =>
                    updateField('has_own_gas_boilerroom', checked === true)
                  }
                />
                Budynek posiada własną kotłownię gazową
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Przewody kominowe budynku</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Liczba punktów / otworów kominowych w lokalach</Label>
                <Input
                  inputMode="numeric"
                  value={formData.chimney_openings_in_units}
                  onChange={(e) => updateField('chimney_openings_in_units', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Liczba trzonów kominowych ponad dachem</Label>
                <Input
                  inputMode="numeric"
                  value={formData.chimney_shafts_above_roof}
                  onChange={(e) => updateField('chimney_shafts_above_roof', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Rodzaj przewodów kominowych w budynku</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {CHIMNEY_DUCT_TYPE_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={formData.chimney_duct_types.includes(option.value)}
                        onCheckedChange={() => toggleChimneyType(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Instalacja elektryczna i odgromowa</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Liczba lokali mieszkalnych / użytkowych ogółem</Label>
                <Input
                  inputMode="numeric"
                  value={formData.total_residential_units}
                  onChange={(e) => updateField('total_residential_units', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Liczba klatek schodowych</Label>
                <Input
                  inputMode="numeric"
                  value={formData.staircases_count}
                  onChange={(e) => updateField('staircases_count', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Liczba złączy kontrolnych instalacji odgromowej</Label>
                <Input
                  inputMode="numeric"
                  value={formData.lightning_control_joints}
                  onChange={(e) => updateField('lightning_control_joints', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Instalacje sanitarne i ppoż.</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Liczba węzłów cieplnych / kotłowni</Label>
                <Input
                  inputMode="numeric"
                  value={formData.heat_nodes_or_boilerrooms}
                  onChange={(e) => updateField('heat_nodes_or_boilerrooms', e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox
                  checked={formData.has_internal_hydrant_system}
                  onCheckedChange={(checked) =>
                    updateField('has_internal_hydrant_system', checked === true)
                  }
                />
                Budynek posiada wewnętrzną instalację hydrantową
              </label>
            </div>
          </section>

          <Button type="button" onClick={() => void handleSaveTechnical()} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Zapisz dane techniczne
          </Button>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-3">
          {isLoadingInspections ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {BUILDING_INSPECTION_DEFINITIONS.map((def) => {
                const row = inspections.find((item) => item.inspection_type === def.type);
                const status = computeInspectionStatus(row?.next_inspected_at ?? null);
                return (
                  <div
                    key={def.type}
                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
                  >
                    <div>
                      <p className="text-sm font-medium">{def.label}</p>
                      <Badge
                        variant="outline"
                        className={cn('mt-2 font-normal', statusBadgeClass(status))}
                      >
                        {inspectionStatusLabel(status)}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Data ostatniego przeglądu
                      </Label>
                      <Input
                        type="date"
                        value={row?.last_inspected_at ?? ''}
                        onChange={(e) =>
                          void handleInspectionDateChange(def.type, e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Data kolejnego przeglądu
                      </Label>
                      <Input type="date" value={row?.next_inspected_at ?? ''} disabled />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
