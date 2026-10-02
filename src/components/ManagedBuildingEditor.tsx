'use client';

import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
  Building2,
  Droplets,
  Flame,
  Loader2,
  MapPin,
  Trash2,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { formatBuildingAddressLine } from '../lib/database/condo-board-housing';
import { InspectionStatusBadge } from './housing/InspectionStatusBadge';
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
  grouped?: boolean;
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

function EditorSection({
  grouped,
  title,
  icon: Icon,
  children,
}: {
  grouped: boolean;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}): ReactElement {
  const heading = (
    <span className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-brand-navy">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      {title}
    </span>
  );

  if (!grouped) {
    return (
      <section className="space-y-3">
        <h4 className="text-sm font-semibold">{heading}</h4>
        {children}
      </section>
    );
  }

  return (
    <Card className="h-full bg-white">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-medium">{heading}</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

const visibleFieldClass =
  'h-10 border-border bg-white text-sm font-medium text-foreground shadow-sm disabled:bg-white disabled:text-foreground disabled:opacity-100';

export function ManagedBuildingEditor({
  building,
  grouped = false,
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

  const addressLine = formatBuildingAddressLine(building);
  const summaryAddress = formatBuildingAddressLine({
    address: formData.address,
    city: formData.city,
    postal_code: formData.postal_code,
  });
  const summaryFacts: Array<{ label: string; value: string }> = [
    { label: 'Adres', value: summaryAddress === '—' ? 'Brak adresu' : summaryAddress },
    { label: 'Lokale', value: formData.total_residential_units.trim() || '—' },
    { label: 'Kondygnacje', value: formData.above_ground_floors.trim() || '—' },
    { label: 'Klatki', value: formData.staircases_count.trim() || '—' },
  ];

  return (
    <div className={cn('space-y-5', !grouped && 'rounded-lg border bg-card p-4')}>
      <div className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-brand-navy">
            {building.name || addressLine}
          </h2>
          <p className="text-sm text-muted-foreground">
            Dane techniczne i kalendarz przeglądów
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Wróć do listy
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
        {summaryFacts.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 truncate text-base font-semibold text-brand-navy">{item.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="text-xs font-medium text-muted-foreground">Przeglądy</dt>
          <dd className="mt-1.5">
            {isLoadingInspections ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <InspectionStatusBadge inspections={inspections} />
            )}
          </dd>
        </div>
      </dl>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Kalendarz przeglądów</h4>
        {isLoadingInspections ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <Table className="bg-white">
              <TableHeader className="bg-white [&_tr]:border-b [&_tr]:bg-white [&_tr]:hover:bg-white">
                <TableRow className="bg-white hover:bg-white">
                  <TableHead className="bg-white">Przegląd</TableHead>
                  <TableHead className="bg-white">Status</TableHead>
                  <TableHead className="bg-white">Ostatni</TableHead>
                  <TableHead className="bg-white">Kolejny</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {BUILDING_INSPECTION_DEFINITIONS.map((def) => {
                  const row = inspections.find((item) => item.inspection_type === def.type);
                  const status = computeInspectionStatus(row?.next_inspected_at ?? null);
                  return (
                    <TableRow key={def.type} className="bg-white hover:bg-slate-50">
                      <TableCell className="min-w-48 bg-white font-medium">{def.label}</TableCell>
                      <TableCell className="bg-white">
                        <Badge
                          variant="outline"
                          className={cn('font-normal', statusBadgeClass(status))}
                        >
                          {inspectionStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="bg-white">
                        <Input
                          type="date"
                          aria-label={`Data ostatniego przeglądu: ${def.label}`}
                          value={row?.last_inspected_at ?? ''}
                          onChange={(e) =>
                            void handleInspectionDateChange(def.type, e.target.value)
                          }
                          className={visibleFieldClass}
                        />
                      </TableCell>
                      <TableCell className="bg-white">
                        <Input
                          type="date"
                          aria-label={`Data kolejnego przeglądu: ${def.label}`}
                          value={row?.next_inspected_at ?? ''}
                          disabled
                          className={visibleFieldClass}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold">Dane techniczne</h4>
        <div className="grid gap-4 lg:grid-cols-2">
          <EditorSection grouped={grouped} title="Adres i identyfikator" icon={MapPin}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="building-address">Ulica i numer</Label>
                <Input
                  id="building-address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="np. ul. Królewska 12"
                  autoComplete="street-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building-postal">Kod pocztowy</Label>
                <Input
                  id="building-postal"
                  value={formData.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                  placeholder="00-000"
                  autoComplete="postal-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building-city">Miasto</Label>
                <Input
                  id="building-city"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="np. Warszawa"
                  autoComplete="address-level2"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="building-name">Nazwa / Identyfikator budynku</Label>
                <Input
                  id="building-name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder='Np. „Budynek A”, „ul. Królewska 4A”'
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection grouped={grouped} title="Gabaryty i konstrukcja budynku" icon={Building2}>
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
          </EditorSection>

          <EditorSection grouped={grouped} title="Instalacja gazowa budynku" icon={Flame}>
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
          </EditorSection>

          <EditorSection grouped={grouped} title="Przewody kominowe budynku" icon={Wind}>
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
          </EditorSection>

          <EditorSection grouped={grouped} title="Instalacja elektryczna i odgromowa" icon={Zap}>
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
          </EditorSection>

          <EditorSection grouped={grouped} title="Instalacje sanitarne i ppoż." icon={Droplets}>
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
          </EditorSection>

          <div className={cn('lg:col-span-2', grouped && 'flex justify-end')}>
            <Button type="button" onClick={() => void handleSaveTechnical()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Zapisz dane techniczne
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
