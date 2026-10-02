'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import {
  ensureCondoBoardDefaultEntity,
  ensureCondoBoardSeedBuilding,
  formatBuildingDisplayName,
} from '../../lib/database/condo-board-housing';
import { fetchManagerHousingEntities } from '../../lib/database/managed-housing-entities';
import {
  createManagedBuilding,
  deleteManagedBuilding,
  fetchBuildingInspectionsForBuildings,
  fetchManagedBuildingsForEntities,
} from '../../lib/database/managed-buildings';
import { formatPostgrestError } from '../../lib/database/postgrest-error';
import { lookupCityByPostalCode } from '../../lib/postal-code/lookup-city';
import type { ManagedHousingUiCopy } from '../../lib/profile/account-role-labels';
import type { ManagedBuilding, ManagedBuildingInspection } from '../../types/managed-building';
import { EMPTY_MANAGED_BUILDING_FORM } from '../../types/managed-building';
import type { ManagedHousingEntity } from '../../types/managed-housing-entity';

export interface BoardBuildingAddressForm {
  address: string;
  city: string;
  postal_code: string;
  name: string;
}

export const EMPTY_BOARD_BUILDING_ADDRESS_FORM: BoardBuildingAddressForm = {
  address: '',
  city: '',
  postal_code: '',
  name: '',
};

export function useBoardBuildingsWorkspace(companyId: string, copy: ManagedHousingUiCopy) {
  const [defaultEntity, setDefaultEntity] = useState<ManagedHousingEntity | null>(null);
  const [buildings, setBuildings] = useState<ManagedBuilding[]>([]);
  const [inspectionsByBuildingId, setInspectionsByBuildingId] = useState<
    Record<string, ManagedBuildingInspection[]>
  >({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<ManagedBuilding | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressForm, setAddressForm] = useState<BoardBuildingAddressForm>(
    EMPTY_BOARD_BUILDING_ADDRESS_FORM,
  );
  const [isLookingUpCity, setIsLookingUpCity] = useState(false);

  const filteredBuildings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return buildings;
    return buildings.filter((building) => {
      const haystack = [
        building.name,
        building.address ?? '',
        building.city ?? '',
        building.postal_code ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [buildings, searchQuery]);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const supabase = createClient();

    const { data: entity, error: entityError } = await ensureCondoBoardDefaultEntity(
      supabase,
      companyId,
    );
    if (entityError || !entity) {
      setError(formatPostgrestError(entityError) || copy.loadEntitiesError);
      setDefaultEntity(null);
      setBuildings([]);
      setInspectionsByBuildingId({});
      setIsLoading(false);
      return;
    }

    setDefaultEntity(entity);
    await ensureCondoBoardSeedBuilding(supabase, entity);

    // List buildings across all company entities (legacy NIP-added wspólnoty may exist).
    const { data: allEntities } = await fetchManagerHousingEntities(supabase, companyId);
    const entityIds =
      allEntities && allEntities.length > 0
        ? allEntities.map((item) => item.id)
        : [entity.id];

    const { data: allBuildings, error: buildingsError } = await fetchManagedBuildingsForEntities(
      supabase,
      entityIds,
    );
    if (buildingsError) {
      setError(buildingsError.message || copy.loadChildrenError);
      setBuildings([]);
      setInspectionsByBuildingId({});
      setIsLoading(false);
      return;
    }

    const nextBuildings = allBuildings ?? [];
    setBuildings(nextBuildings);

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
    setIsLoading(false);
  }, [companyId, copy.loadChildrenError, copy.loadEntitiesError]);

  useEffect(() => {
    // Load portfolio on mount / company change (async fetch → setState).
    /* eslint-disable react-hooks/set-state-in-effect -- initial workspace load */
    void loadWorkspace();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadWorkspace]);

  const openAddDialog = () => {
    setAddressForm(EMPTY_BOARD_BUILDING_ADDRESS_FORM);
    setIsAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    setAddressForm(EMPTY_BOARD_BUILDING_ADDRESS_FORM);
  };

  const handlePostalCodeBlur = async () => {
    const postal = addressForm.postal_code.trim();
    if (!postal || addressForm.city.trim()) return;
    setIsLookingUpCity(true);
    const city = await lookupCityByPostalCode(postal);
    if (city) {
      setAddressForm((prev) => ({ ...prev, city }));
    }
    setIsLookingUpCity(false);
  };

  const handleCreateBuildingByAddress = async () => {
    const address = addressForm.address.trim();
    const city = addressForm.city.trim();
    const postalCode = addressForm.postal_code.trim();
    if (!address) {
      setError(copy.addChildNameRequired);
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const supabase = createClient();
    let entity = defaultEntity;
    if (!entity) {
      const ensured = await ensureCondoBoardDefaultEntity(supabase, companyId);
      if (ensured.error || !ensured.data) {
        setError(formatPostgrestError(ensured.error) || copy.addChildError);
        setIsSubmitting(false);
        return;
      }
      entity = ensured.data;
      setDefaultEntity(entity);
    }

    const name =
      addressForm.name.trim() ||
      formatBuildingDisplayName({
        address,
        city,
        postal_code: postalCode,
      });

    const { data, error: createError } = await createManagedBuilding(supabase, entity.id, {
      ...EMPTY_MANAGED_BUILDING_FORM,
      name,
      address,
      city,
      postal_code: postalCode,
    });

    if (createError || !data) {
      setError(createError?.message || copy.addChildError);
      setIsSubmitting(false);
      return;
    }

    setBuildings((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
    );
    closeAddDialog();
    setSelectedBuilding(data);
    setSuccess(copy.addChildSuccess);
    setIsSubmitting(false);
  };

  const handleDeleteBuilding = async (building: ManagedBuilding) => {
    if (!window.confirm(`Usunąć budynek „${building.name}"?`)) return;
    setIsSubmitting(true);
    setError('');
    const supabase = createClient();
    const { success: deleted, error: deleteError } = await deleteManagedBuilding(
      supabase,
      building.id,
      building.managed_entity_id,
    );
    if (!deleted || deleteError) {
      setError(deleteError?.message || copy.deleteEntityError);
      setIsSubmitting(false);
      return;
    }
    setBuildings((prev) => prev.filter((item) => item.id !== building.id));
    setInspectionsByBuildingId((prev) => {
      const next = { ...prev };
      delete next[building.id];
      return next;
    });
    if (selectedBuilding?.id === building.id) {
      setSelectedBuilding(null);
    }
    setSuccess(copy.deleteChildSuccess);
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
    setSelectedBuilding(null);
    setSuccess(copy.deleteChildSuccess);
  };

  return {
    defaultEntity,
    buildings,
    filteredBuildings,
    inspectionsByBuildingId,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    success,
    setError,
    setSuccess,
    selectedBuilding,
    setSelectedBuilding,
    isAddDialogOpen,
    setIsAddDialogOpen,
    isSubmitting,
    addressForm,
    setAddressForm,
    isLookingUpCity,
    openAddDialog,
    closeAddDialog,
    handlePostalCodeBlur,
    handleCreateBuildingByAddress,
    handleDeleteBuilding,
    onBuildingUpdated,
    onBuildingDeleted,
    reload: loadWorkspace,
  };
}

export type BoardBuildingsWorkspace = ReturnType<typeof useBoardBuildingsWorkspace>;
