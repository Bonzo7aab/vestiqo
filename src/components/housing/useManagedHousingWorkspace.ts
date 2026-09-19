'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import {
  createManagedHousingEntity,
  deleteManagedHousingEntity,
  fetchManagerHousingEntities,
  updateManagedHousingEntity,
} from '../../lib/database/managed-housing-entities';
import {
  createManagedBuilding,
  fetchBuildingInspectionsForBuildings,
  fetchManagedBuildingsForEntities,
  fetchManagedBuildingsForEntity,
} from '../../lib/database/managed-buildings';
import { formatPostgrestError } from '../../lib/database/postgrest-error';
import { useGusNipLookup } from '../../lib/gus/use-gus-nip-lookup';
import type { CompanyLookupResult } from '../../lib/gus/types';
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import type {
  ManagedHousingEntity,
  ManagedHousingEntityFormData,
} from '../../types/managed-housing-entity';
import type { ManagedBuilding, ManagedBuildingInspection } from '../../types/managed-building';
import { EMPTY_MANAGED_BUILDING_FORM } from '../../types/managed-building';

export const EMPTY_HOUSING_ENTITY_FORM: ManagedHousingEntityFormData = {
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

export function entityToForm(entity: ManagedHousingEntity): ManagedHousingEntityFormData {
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

export function useManagedHousingWorkspace(companyId: string, copy: ManagedHousingUiCopy) {
  const [entities, setEntities] = useState<ManagedHousingEntity[]>([]);
  const [buildingCounts, setBuildingCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<ManagedHousingEntity | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<ManagedHousingEntity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ManagedHousingEntityFormData>(EMPTY_HOUSING_ENTITY_FORM);
  const [basicsForm, setBasicsForm] = useState<ManagedHousingEntityFormData>(
    EMPTY_HOUSING_ENTITY_FORM,
  );
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [inspectionsByBuildingId, setInspectionsByBuildingId] = useState<
    Record<string, ManagedBuildingInspection[]>
  >({});
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<ManagedBuilding | null>(null);
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');

  const filteredEntities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entities;
    return entities.filter((entity) => {
      return (
        entity.name.toLowerCase().includes(query) ||
        entity.nip.toLowerCase().includes(query) ||
        (entity.city ?? '').toLowerCase().includes(query)
      );
    });
  }, [entities, searchQuery]);

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: fetchError } = await fetchManagerHousingEntities(supabase, companyId);
    if (fetchError) {
      setError(formatPostgrestError(fetchError) || copy.loadEntitiesError);
      setEntities([]);
      setBuildingCounts({});
      setIsLoading(false);
      return;
    }

    const nextEntities = data ?? [];
    setEntities(nextEntities);

    const entityIds = nextEntities.map((entity) => entity.id);
    const { data: allBuildings } = await fetchManagedBuildingsForEntities(supabase, entityIds);
    const counts: Record<string, number> = {};
    for (const entity of nextEntities) {
      counts[entity.id] = 0;
    }
    for (const building of allBuildings ?? []) {
      counts[building.managed_entity_id] = (counts[building.managed_entity_id] ?? 0) + 1;
    }
    setBuildingCounts(counts);
    setIsLoading(false);
  }, [companyId, copy.loadEntitiesError]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);

  const loadBuildings = useCallback(
    async (entityId: string) => {
      setIsLoadingBuildings(true);
      const supabase = createClient();
      const { data, error: fetchError } = await fetchManagedBuildingsForEntity(supabase, entityId);
      if (fetchError) {
        setError(fetchError.message || copy.loadChildrenError);
        setBuildings([]);
        setInspectionsByBuildingId({});
        setIsLoadingBuildings(false);
        return;
      }

      const nextBuildings = data ?? [];
      setBuildings(nextBuildings);
      setBuildingCounts((prev) => ({ ...prev, [entityId]: nextBuildings.length }));

      const { data: inspections } = await fetchBuildingInspectionsForBuildings(
        supabase,
        nextBuildings.map((building) => building.id),
      );
      const grouped: Record<string, ManagedBuildingInspection[]> = {};
      for (const inspection of inspections ?? []) {
        const list = grouped[inspection.building_id] ?? [];
        list.push(inspection);
        grouped[inspection.building_id] = list;
      }
      setInspectionsByBuildingId(grouped);
      setIsLoadingBuildings(false);
    },
    [copy.loadChildrenError],
  );

  useEffect(() => {
    if (!selectedEntity) {
      setBuildings([]);
      setSelectedBuilding(null);
      setInspectionsByBuildingId({});
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
    setFormData(EMPTY_HOUSING_ENTITY_FORM);
    setIsAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    setFormData(EMPTY_HOUSING_ENTITY_FORM);
  };

  const selectEntity = (entity: ManagedHousingEntity | null) => {
    setSelectedEntity(entity);
    setSelectedBuilding(null);
    setSuccess('');
    setError('');
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError(copy.needGusName);
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
        setError(result.error.message || copy.addEntityError);
        return;
      }

      setSuccess(copy.addEntitySuccess);
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
      const result = await updateManagedHousingEntity(supabase, selectedEntity.id, companyId, {
        ...basicsForm,
        entity_type: selectedEntity.entity_type || 'wspólnota',
        nip: selectedEntity.nip,
      });

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
        setError(deleteError?.message || copy.deleteEntityError);
        return;
      }
      setSuccess(copy.deleteEntitySuccess);
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
      setError(copy.addChildNameRequired);
      return;
    }

    setIsSubmitting(true);
    setError('');
    const supabase = createClient();
    const { data, error: createError } = await createManagedBuilding(supabase, selectedEntity.id, {
      ...EMPTY_MANAGED_BUILDING_FORM,
      name: newBuildingName.trim(),
    });

    if (createError || !data) {
      setError(createError?.message || copy.addChildError);
      setIsSubmitting(false);
      return;
    }

    setBuildings((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'pl')));
    setBuildingCounts((prev) => ({
      ...prev,
      [selectedEntity.id]: (prev[selectedEntity.id] ?? 0) + 1,
    }));
    setIsAddBuildingOpen(false);
    setNewBuildingName('');
    setSelectedBuilding(data);
    setSuccess(copy.addChildSuccess);
    setIsSubmitting(false);
  };

  const onBuildingUpdated = (updated: ManagedBuilding) => {
    setSelectedBuilding(updated);
    setBuildings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const onBuildingDeleted = (buildingId: string) => {
    setBuildings((prev) => prev.filter((item) => item.id !== buildingId));
    setInspectionsByBuildingId((prev) => {
      const next = { ...prev };
      delete next[buildingId];
      return next;
    });
    if (selectedEntity) {
      setBuildingCounts((prev) => ({
        ...prev,
        [selectedEntity.id]: Math.max(0, (prev[selectedEntity.id] ?? 1) - 1),
      }));
    }
    setSelectedBuilding(null);
    setSuccess(copy.deleteChildSuccess);
  };

  const previewFields = [
    { label: 'Nazwa', value: formData.name },
    { label: 'REGON', value: formData.regon },
    { label: 'Adres', value: formData.address },
    { label: 'Miasto', value: formData.city },
    { label: 'Kod pocztowy', value: formData.postal_code },
  ];

  return {
    entities,
    filteredEntities,
    buildingCounts,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    success,
    setError,
    setSuccess,
    isAddDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    selectedEntity,
    deletingEntity,
    setDeletingEntity,
    isSubmitting,
    formData,
    setFormData,
    basicsForm,
    setBasicsForm,
    buildings,
    inspectionsByBuildingId,
    isLoadingBuildings,
    selectedBuilding,
    setSelectedBuilding,
    isAddBuildingOpen,
    setIsAddBuildingOpen,
    newBuildingName,
    setNewBuildingName,
    gusLookup,
    previewFields,
    openAddDialog,
    closeAddDialog,
    selectEntity,
    handleCreate,
    handleSaveBasics,
    handleDelete,
    handleCreateBuilding,
    onBuildingUpdated,
    onBuildingDeleted,
  };
}

export type ManagedHousingWorkspace = ReturnType<typeof useManagedHousingWorkspace>;
