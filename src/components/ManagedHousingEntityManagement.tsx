'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  MapPin,
  Loader2,
  X,
  Check,
  List,
  LayoutGrid,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { createClient } from '../lib/supabase/client';
import {
  createManagedHousingEntity,
  deleteManagedHousingEntity,
  fetchManagerHousingEntities,
  updateManagedHousingEntity,
} from '../lib/database/managed-housing-entities';
import {
  createManagedBuilding,
  fetchManagedBuildingsForEntity,
} from '../lib/database/managed-buildings';
import { formatPostgrestError } from '../lib/database/postgrest-error';
import { GusNipStatusHint } from './gus/GusNipStatusHint';
import { useGusNipLookup } from '../lib/gus/use-gus-nip-lookup';
import type { CompanyLookupResult } from '../lib/gus/types';
import type {
  ManagedHousingEntity,
  ManagedHousingEntityFormData,
} from '../types/managed-housing-entity';
import type { ManagedBuilding } from '../types/managed-building';
import { EMPTY_MANAGED_BUILDING_FORM } from '../types/managed-building';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ManagedBuildingEditor } from './ManagedBuildingEditor';

interface ManagedHousingEntityManagementProps {
  companyId: string;
}

type ViewMode = 'gallery' | 'list';

const EMPTY_FORM: ManagedHousingEntityFormData = {
  entity_type: 'wspólnota',
  nip: '',
  regon: '',
  name: '',
  address: '',
  city: '',
  postal_code: '',
  bank_account_iban: '',
  vat_status: '',
};

function entityToForm(entity: ManagedHousingEntity): ManagedHousingEntityFormData {
  return {
    entity_type: entity.entity_type,
    nip: entity.nip,
    regon: entity.regon ?? '',
    name: entity.name,
    address: entity.address ?? '',
    city: entity.city ?? '',
    postal_code: entity.postal_code ?? '',
    bank_account_iban: entity.bank_account_iban ?? '',
    vat_status: entity.vat_status ?? '',
  };
}

export function ManagedHousingEntityManagement({
  companyId,
}: ManagedHousingEntityManagementProps) {
  const [entities, setEntities] = useState<ManagedHousingEntity[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [nameFilter, setNameFilter] = useState('');
  const [nipFilter, setNipFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<ManagedHousingEntity | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<ManagedHousingEntity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ManagedHousingEntityFormData>(EMPTY_FORM);
  const [basicsForm, setBasicsForm] = useState<ManagedHousingEntityFormData>(EMPTY_FORM);
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<ManagedBuilding | null>(null);
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');

  const filteredEntities = useMemo(() => {
    const nameQuery = nameFilter.trim().toLowerCase();
    const nipQuery = nipFilter.trim().toLowerCase();
    return entities.filter((entity) => {
      const matchesName =
        !nameQuery ||
        entity.name.toLowerCase().includes(nameQuery) ||
        (entity.city ?? '').toLowerCase().includes(nameQuery);
      const matchesNip = !nipQuery || entity.nip.toLowerCase().includes(nipQuery);
      return matchesName && matchesNip;
    });
  }, [entities, nameFilter, nipFilter]);

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: fetchError } = await fetchManagerHousingEntities(supabase, companyId);
    if (fetchError) {
      setError(formatPostgrestError(fetchError) || 'Nie udało się wczytać nieruchomości');
      setEntities([]);
    } else {
      setEntities(data ?? []);
    }
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const loadBuildings = useCallback(async (entityId: string) => {
    setIsLoadingBuildings(true);
    const supabase = createClient();
    const { data, error: fetchError } = await fetchManagedBuildingsForEntity(supabase, entityId);
    if (fetchError) {
      setError(fetchError.message || 'Nie udało się wczytać budynków');
      setBuildings([]);
    } else {
      setBuildings(data ?? []);
    }
    setIsLoadingBuildings(false);
  }, []);

  useEffect(() => {
    if (!selectedEntity) {
      setBuildings([]);
      setSelectedBuilding(null);
      return;
    }
    setBasicsForm(entityToForm(selectedEntity));
    void loadBuildings(selectedEntity.id);
  }, [selectedEntity, loadBuildings]);

  const applyGusToForm = useCallback((data: CompanyLookupResult) => {
    setFormData((prev) => ({
      ...prev,
      name: data.name,
      regon: data.regon ?? '',
      address: data.address ?? '',
      city: data.city ?? '',
      postal_code: data.postalCode ?? '',
      bank_account_iban: data.bankAccountIban ?? prev.bank_account_iban,
      vat_status: data.vatStatus ?? prev.vat_status,
    }));
  }, []);

  const clearGusDerived = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      regon: '',
      name: '',
      address: '',
      city: '',
      postal_code: '',
      bank_account_iban: '',
      vat_status: '',
    }));
  }, []);

  const gusLookup = useGusNipLookup({
    enabled: isAddDialogOpen,
    nip: formData.nip,
    onApply: applyGusToForm,
    onClearDerived: clearGusDerived,
    trigger: 'debounce',
    debounceMs: 0,
  });

  const openAddDialog = () => {
    setFormData(EMPTY_FORM);
    setIsAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    setFormData(EMPTY_FORM);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('Wyszukaj NIP w rejestrze GUS, aby pobrać dane nieruchomości');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const result = await createManagedHousingEntity(supabase, companyId, {
        ...formData,
        entity_type: 'wspólnota',
      });

      if (result.error) {
        setError(result.error.message || 'Nie udało się dodać nieruchomości');
        return;
      }

      setSuccess('Dodano nieruchomość');
      closeAddDialog();
      await loadEntities();
      if (result.data) {
        setSelectedEntity(result.data);
      }
    } catch {
      setError('Wystąpił błąd podczas zapisywania');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBasics = async () => {
    if (!selectedEntity) return;
    if (!basicsForm.name.trim()) {
      setError('Nazwa jest wymagana');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const result = await updateManagedHousingEntity(
        supabase,
        selectedEntity.id,
        companyId,
        {
          ...basicsForm,
          entity_type: selectedEntity.entity_type || 'wspólnota',
          nip: selectedEntity.nip,
        },
      );

      if (result.error || !result.data) {
        setError(result.error?.message || 'Nie udało się zapisać danych');
        return;
      }

      setSelectedEntity(result.data);
      setEntities((prev) =>
        prev.map((item) => (item.id === result.data!.id ? result.data! : item)),
      );
      setSuccess('Zapisano dane podstawowe');
    } catch {
      setError('Wystąpił błąd podczas zapisywania');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntity) return;
    setIsSubmitting(true);
    setError('');
    try {
      const supabase = createClient();
      const { success: deleted, error: deleteError } = await deleteManagedHousingEntity(
        supabase,
        deletingEntity.id,
        companyId,
      );
      if (deleteError || !deleted) {
        setError(deleteError?.message || 'Nie udało się usunąć nieruchomości');
        return;
      }
      setSuccess('Usunięto nieruchomość');
      setIsDeleteDialogOpen(false);
      if (selectedEntity?.id === deletingEntity.id) {
        setSelectedEntity(null);
      }
      setDeletingEntity(null);
      await loadEntities();
    } catch {
      setError('Wystąpił błąd podczas usuwania');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBuilding = async () => {
    if (!selectedEntity) return;
    if (!newBuildingName.trim()) {
      setError('Podaj nazwę / identyfikator budynku');
      return;
    }

    setIsSubmitting(true);
    setError('');
    const supabase = createClient();
    const { data, error: createError } = await createManagedBuilding(
      supabase,
      selectedEntity.id,
      {
        ...EMPTY_MANAGED_BUILDING_FORM,
        name: newBuildingName.trim(),
      },
    );

    if (createError || !data) {
      setError(createError?.message || 'Nie udało się dodać budynku');
      setIsSubmitting(false);
      return;
    }

    setBuildings((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'pl')));
    setIsAddBuildingOpen(false);
    setNewBuildingName('');
    setSelectedBuilding(data);
    setSuccess('Dodano budynek');
    setIsSubmitting(false);
  };

  const previewFields = [
    { label: 'Nazwa', value: formData.name },
    { label: 'REGON', value: formData.regon },
    { label: 'Adres', value: formData.address },
    { label: 'Miasto', value: formData.city },
    { label: 'Kod pocztowy', value: formData.postal_code },
  ];

  if (selectedEntity && selectedBuilding) {
    return (
      <div className="space-y-4" id="nieruchomosci">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}
        <ManagedBuildingEditor
          building={selectedBuilding}
          onUpdated={(updated) => {
            setSelectedBuilding(updated);
            setBuildings((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
          onDeleted={(buildingId) => {
            setBuildings((prev) => prev.filter((item) => item.id !== buildingId));
            setSelectedBuilding(null);
            setSuccess('Usunięto budynek');
          }}
          onClose={() => setSelectedBuilding(null)}
        />
      </div>
    );
  }

  if (selectedEntity) {
    return (
      <div className="space-y-4" id="nieruchomosci">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {success ? (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit"
              onClick={() => {
                setSelectedEntity(null);
                setSuccess('');
                setError('');
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Lista nieruchomości
            </Button>
            <h2 className="text-xl font-semibold tracking-tight">{selectedEntity.name}</h2>
            <p className="text-sm text-muted-foreground">NIP {selectedEntity.nip}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setDeletingEntity(selectedEntity);
              setIsDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń nieruchomość
          </Button>
        </div>

        <Tabs defaultValue="basics" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto sm:inline-flex">
            <TabsTrigger value="basics">Dane Podstawowe</TabsTrigger>
            <TabsTrigger value="buildings">Budynki ({buildings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-5">
                <p className="text-sm text-muted-foreground">
                  Pola pobrane z NIP (GUS). Numer NIP jest stały po dodaniu nieruchomości.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>NIP</Label>
                    <Input value={basicsForm.nip} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>REGON</Label>
                    <Input
                      value={basicsForm.regon}
                      onChange={(e) =>
                        setBasicsForm((prev) => ({ ...prev, regon: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Nazwa</Label>
                    <Input
                      value={basicsForm.name}
                      onChange={(e) =>
                        setBasicsForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Adres</Label>
                    <Input
                      value={basicsForm.address}
                      onChange={(e) =>
                        setBasicsForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Miasto</Label>
                    <Input
                      value={basicsForm.city}
                      onChange={(e) =>
                        setBasicsForm((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kod pocztowy</Label>
                    <Input
                      value={basicsForm.postal_code}
                      onChange={(e) =>
                        setBasicsForm((prev) => ({ ...prev, postal_code: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => void handleSaveBasics()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Zapisz dane podstawowe
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="buildings" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Dodaj budynki należące do tej nieruchomości i uzupełnij dane techniczne oraz
                kalendarz przeglądów.
              </p>
              <Button type="button" size="sm" onClick={() => setIsAddBuildingOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj budynek
              </Button>
            </div>

            {isLoadingBuildings ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : buildings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Brak budynków. Dodaj pierwszy budynek, aby uzupełnić dane techniczne.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {buildings.map((building) => (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => setSelectedBuilding(building)}
                    className="rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{building.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Otwórz dane techniczne i przeglądy
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isAddBuildingOpen} onOpenChange={setIsAddBuildingOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dodaj budynek</DialogTitle>
              <DialogDescription>
                Podaj nazwę lub identyfikator budynku. Szczegóły uzupełnisz w kolejnym kroku.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="new-building-name">Nazwa / Identyfikator budynku</Label>
              <Input
                id="new-building-name"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder='Np. „Budynek A”'
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddBuildingOpen(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateBuilding()}
                disabled={isSubmitting || !newBuildingName.trim()}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Dodaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć nieruchomość?</AlertDialogTitle>
              <AlertDialogDescription>
                {deletingEntity
                  ? `Czy na pewno chcesz usunąć „${deletingEntity.name}" wraz z budynkami i przeglądami? Ta operacja jest nieodwracalna.`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
                disabled={isSubmitting}
                className={cn(
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                )}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usuń'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="nieruchomosci">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold tracking-tight">
              Zarządzanie nieruchomościami
            </h2>
            {entities.length > 0 ? (
              <Badge variant="secondary">
                {entities.length}{' '}
                {entities.length === 1 ? 'nieruchomość' : 'nieruchomości'}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Dodawaj wspólnoty po NIP, a następnie budynki z danymi technicznymi i przeglądami.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            size="sm"
          >
            <ToggleGroupItem value="gallery" aria-label="Widok galerii">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="Widok listy">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj nieruchomość
          </Button>
        </div>
      </div>

      {entities.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Filtruj po nazwie lub mieście..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <Input
            placeholder="Filtruj po NIP..."
            value={nipFilter}
            onChange={(e) => setNipFilter(e.target.value)}
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entities.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">
            Nie masz jeszcze dodanych nieruchomości. Dodaj nieruchomość po numerze NIP —
            dane zostaną pobrane z rejestru GUS.
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj nieruchomość
          </Button>
        </div>
      ) : viewMode === 'gallery' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredEntities.map((entity) => (
            <Card
              key={entity.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => setSelectedEntity(entity)}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{entity.name}</p>
                    <p className="text-xs text-muted-foreground">NIP {entity.nip}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingEntity(entity);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {(entity.address || entity.city) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {[entity.address, entity.postal_code, entity.city]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead className="w-[100px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntities.map((entity) => (
              <TableRow
                key={entity.id}
                className="cursor-pointer"
                onClick={() => setSelectedEntity(entity)}
              >
                <TableCell className="font-medium">{entity.name}</TableCell>
                <TableCell>{entity.nip}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[entity.address, entity.city].filter(Boolean).join(', ') || '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingEntity(entity);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj nieruchomość</DialogTitle>
            <DialogDescription>
              Podaj NIP wspólnoty mieszkaniowej — dane zostaną pobrane z rejestru GUS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="entity-nip">NIP wspólnoty mieszkaniowej *</Label>
              <div className="relative">
                <Input
                  id="entity-nip"
                  value={formData.nip}
                  onChange={(e) => {
                    if (gusLookup.isLoading) return;
                    gusLookup.handleNipChange(e.target.value, (next) =>
                      setFormData((prev) => ({ ...prev, nip: next })),
                    );
                  }}
                  placeholder="0000000000"
                  inputMode="numeric"
                  disabled={gusLookup.isLoading || isSubmitting}
                  aria-busy={gusLookup.isLoading}
                  className={cn(gusLookup.isLoading && 'pr-10 opacity-80')}
                />
                {gusLookup.isLoading ? (
                  <Loader2
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary"
                    aria-hidden
                  />
                ) : null}
              </div>
              <GusNipStatusHint
                status={gusLookup.status}
                message={gusLookup.message}
                validationError={gusLookup.validationError}
              />
            </div>

            {gusLookup.isLoading ? (
              <div className="space-y-3 rounded-md border bg-muted/40 p-3" aria-hidden>
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <div className="h-3 animate-pulse rounded bg-muted" />
                    <div className="col-span-2 h-3 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : formData.name ? (
              <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Dane z rejestru
                </p>
                {previewFields.map((field) => (
                  <div key={field.label} className="grid grid-cols-3 gap-2 text-sm">
                    <span className="text-muted-foreground">{field.label}</span>
                    <span className="col-span-2 font-medium">{field.value || '—'}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog} disabled={isSubmitting}>
              <X className="mr-2 h-4 w-4" />
              Anuluj
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={
                isSubmitting || gusLookup.status === 'loading' || !formData.name.trim()
              }
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć nieruchomość?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingEntity
                ? `Czy na pewno chcesz usunąć „${deletingEntity.name}" z listy? Ta operacja jest nieodwracalna.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={isSubmitting}
              className={cn(
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
