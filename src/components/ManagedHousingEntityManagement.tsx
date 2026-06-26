'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Edit2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { createClient } from '../lib/supabase/client';
import {
  createManagedHousingEntity,
  deleteManagedHousingEntity,
  fetchManagerHousingEntities,
  updateManagedHousingEntity,
} from '../lib/database/managed-housing-entities';
import { formatPostgrestError } from '../lib/database/postgrest-error';
import { GusNipStatusHint } from './gus/GusNipStatusHint';
import { useGusNipLookup } from '../lib/gus/use-gus-nip-lookup';
import type { CompanyLookupResult } from '../lib/gus/types';
import type {
  ManagedHousingEntity,
  ManagedHousingEntityFormData,
  ManagedHousingEntityType,
} from '../types/managed-housing-entity';
import {
  formatManagedHousingEntityType,
  MANAGED_HOUSING_ENTITY_TYPE_OPTIONS,
} from '../types/managed-housing-entity';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

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

export function ManagedHousingEntityManagement({ companyId }: ManagedHousingEntityManagementProps) {
  const [entities, setEntities] = useState<ManagedHousingEntity[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [nameFilter, setNameFilter] = useState('');
  const [nipFilter, setNipFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<ManagedHousingEntity | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<ManagedHousingEntity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ManagedHousingEntityFormData>(EMPTY_FORM);
  const [initialLookedUpNip, setInitialLookedUpNip] = useState<string | null>(null);

  const filteredEntities = useMemo(() => {
    const nameQuery = nameFilter.trim().toLowerCase();
    const nipQuery = nipFilter.trim().toLowerCase();
    return entities.filter((entity) => {
      const matchesName =
        !nameQuery ||
        entity.name.toLowerCase().includes(nameQuery) ||
        (entity.city?.toLowerCase().includes(nameQuery) ?? false);
      const matchesNip = !nipQuery || entity.nip.includes(nipQuery);
      return matchesName && matchesNip;
    });
  }, [entities, nameFilter, nipFilter]);

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await fetchManagerHousingEntities(supabase, companyId);
      if (fetchError) {
        const message = formatPostgrestError(fetchError);
        setError(
          fetchError.code === 'PGRST205'
            ? 'Funkcja wymaga aktualizacji bazy danych (brak tabeli wspólnot i spółdzielni). Skontaktuj się z administratorem.'
            : 'Nie udało się załadować wspólnot i spółdzielni',
        );
        console.error('fetchManagerHousingEntities:', message, fetchError);
      } else {
        setEntities(data || []);
      }
    } catch {
      setError('Wystąpił błąd podczas ładowania listy');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const applyGusData = useCallback((data: CompanyLookupResult) => {
    setFormData((prev) => ({
      ...prev,
      name: data.name,
      regon: data.regon,
      address: data.address ?? prev.address,
      city: data.city ?? prev.city,
      postal_code: data.postalCode ?? prev.postal_code,
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
    enabled: isDialogOpen,
    nip: formData.nip,
    onApply: applyGusData,
    onClearDerived: clearGusDerived,
    trigger: 'debounce',
    debounceMs: 0,
    initialLookedUpNip,
  });

  const openAddDialog = () => {
    setEditingEntity(null);
    setFormData(EMPTY_FORM);
    setInitialLookedUpNip(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (entity: ManagedHousingEntity) => {
    setEditingEntity(entity);
    setFormData(entityToForm(entity));
    setInitialLookedUpNip(entity.nip);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingEntity(null);
    setFormData(EMPTY_FORM);
    setInitialLookedUpNip(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Wyszukaj NIP w rejestrze GUS, aby pobrać dane podmiotu');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();
      const result = editingEntity
        ? await updateManagedHousingEntity(supabase, editingEntity.id, companyId, formData)
        : await createManagedHousingEntity(supabase, companyId, formData);

      if (result.error) {
        setError(result.error.message || 'Nie udało się zapisać podmiotu');
        return;
      }

      setSuccess(editingEntity ? 'Zaktualizowano podmiot' : 'Dodano podmiot');
      closeDialog();
      await loadEntities();
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
        setError(deleteError?.message || 'Nie udało się usunąć podmiotu');
        return;
      }
      setSuccess('Usunięto podmiot');
      setIsDeleteDialogOpen(false);
      setDeletingEntity(null);
      await loadEntities();
    } catch {
      setError('Wystąpił błąd podczas usuwania');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewFields = [
    { label: 'Nazwa', value: formData.name },
    { label: 'REGON', value: formData.regon },
    { label: 'Adres', value: formData.address },
    { label: 'Miasto', value: formData.city },
    { label: 'Kod pocztowy', value: formData.postal_code },
  ];

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4" id="wspolnoty-spoldzielnie">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium">Zarządzanie wspólnotami i spółdzielniami</h4>
          {entities.length > 0 && (
            <Badge variant="secondary">
              {entities.length}{' '}
              {entities.length === 1 ? 'podmiot' : 'podmiotów'}
            </Badge>
          )}
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
            <Plus className="h-4 w-4 mr-2" />
            Dodaj podmiot
          </Button>
        </div>
      </div>

      {entities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entities.length === 0 ? (
        <div className="text-center py-10">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Nie masz jeszcze dodanych wspólnot ani spółdzielni. Dodaj podmiot po numerze NIP —
            dane zostaną pobrane z rejestru GUS.
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj pierwszy podmiot
          </Button>
        </div>
      ) : viewMode === 'gallery' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntities.map((entity) => (
            <Card key={entity.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <Badge variant="outline" className="mb-1">
                      {formatManagedHousingEntityType(entity.entity_type)}
                    </Badge>
                    <p className="font-medium truncate">{entity.name}</p>
                    <p className="text-xs text-muted-foreground">NIP {entity.nip}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(entity)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingEntity(entity);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {(entity.address || entity.city) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {[entity.address, entity.postal_code, entity.city].filter(Boolean).join(', ')}
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
              <TableHead>Typ</TableHead>
              <TableHead>Nazwa</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Adres</TableHead>
              <TableHead className="w-[100px]">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntities.map((entity) => (
              <TableRow key={entity.id}>
                <TableCell>
                  <Badge variant="outline">
                    {formatManagedHousingEntityType(entity.entity_type)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{entity.name}</TableCell>
                <TableCell>{entity.nip}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {[entity.address, entity.city].filter(Boolean).join(', ') || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(entity)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingEntity(entity);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntity ? 'Edytuj podmiot' : 'Dodaj wspólnotę lub spółdzielnię'}
            </DialogTitle>
            <DialogDescription>
              Wybierz typ podmiotu i podaj NIP — dane zostaną pobrane z rejestru GUS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Typ podmiotu *</Label>
              <Select
                value={formData.entity_type}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, entity_type: v as ManagedHousingEntityType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANAGED_HOUSING_ENTITY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity-nip">NIP *</Label>
              <div className="relative">
                <Input
                  id="entity-nip"
                  value={formData.nip}
                  onChange={(e) => {
                    if (gusLookup.isLoading) {
                      return;
                    }
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
              <div className="rounded-md border bg-muted/40 p-3 space-y-3" aria-hidden>
                <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <div className="h-3 animate-pulse rounded bg-muted" />
                    <div className="col-span-2 h-3 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : formData.name ? (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
            <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-2" />
              Anuluj
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || gusLookup.status === 'loading' || !formData.name.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {editingEntity ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć podmiot?</AlertDialogTitle>
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
              className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usuń'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
