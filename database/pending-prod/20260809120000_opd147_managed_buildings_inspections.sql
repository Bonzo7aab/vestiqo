-- OPD-147: buildings + inspection calendar under managed housing entities

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. managed_buildings (1:N under managed_housing_entities)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.managed_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  managed_entity_id UUID NOT NULL REFERENCES public.managed_housing_entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Gabaryty i konstrukcja
  above_ground_floors INTEGER,
  below_ground_floors INTEGER,
  roof_area_m2 NUMERIC(12, 2),
  roof_type TEXT CHECK (
    roof_type IS NULL OR roof_type IN (
      'flat_tar_paper',
      'flat_membrane',
      'sloped_tile',
      'sloped_sheet'
    )
  ),
  facade_area_m2 NUMERIC(12, 2),
  -- Instalacja gazowa
  gas_connected_units INTEGER,
  gas_risers_count INTEGER,
  has_own_gas_boilerroom BOOLEAN NOT NULL DEFAULT false,
  -- Przewody kominowe
  chimney_openings_in_units INTEGER,
  chimney_shafts_above_roof INTEGER,
  chimney_duct_types TEXT[] NOT NULL DEFAULT '{}',
  -- Instalacja elektryczna i odgromowa
  total_residential_units INTEGER,
  staircases_count INTEGER,
  lightning_control_joints INTEGER,
  -- Instalacje sanitarne i ppoż.
  heat_nodes_or_boilerrooms INTEGER,
  has_internal_hydrant_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managed_buildings_entity_id
  ON public.managed_buildings (managed_entity_id);

ALTER TABLE public.managed_buildings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company managed buildings" ON public.managed_buildings;
CREATE POLICY "Users can view company managed buildings" ON public.managed_buildings
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.managed_housing_entities mhe
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mhe.id = managed_buildings.managed_entity_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert company managed buildings" ON public.managed_buildings;
CREATE POLICY "Users can insert company managed buildings" ON public.managed_buildings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.managed_housing_entities mhe
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mhe.id = managed_buildings.managed_entity_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update company managed buildings" ON public.managed_buildings;
CREATE POLICY "Users can update company managed buildings" ON public.managed_buildings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.managed_housing_entities mhe
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mhe.id = managed_buildings.managed_entity_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete company managed buildings" ON public.managed_buildings;
CREATE POLICY "Users can delete company managed buildings" ON public.managed_buildings
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.managed_housing_entities mhe
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mhe.id = managed_buildings.managed_entity_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_buildings TO authenticated;
GRANT ALL ON public.managed_buildings TO service_role;

-- ---------------------------------------------------------------------------
-- 2. managed_building_inspections (fixed set of types per building)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.managed_building_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.managed_buildings(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (
    inspection_type IN (
      'gas_annual',
      'chimney_ventilation_annual',
      'general_building_annual',
      'general_building_5y',
      'electrical_lightning_5y',
      'fire_hydrant_annual'
    )
  ),
  last_inspected_at DATE,
  next_inspected_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (building_id, inspection_type)
);

CREATE INDEX IF NOT EXISTS idx_managed_building_inspections_building_id
  ON public.managed_building_inspections (building_id);

ALTER TABLE public.managed_building_inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company building inspections" ON public.managed_building_inspections;
CREATE POLICY "Users can view company building inspections" ON public.managed_building_inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.managed_buildings mb
      JOIN public.managed_housing_entities mhe ON mhe.id = mb.managed_entity_id
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mb.id = managed_building_inspections.building_id
        AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert company building inspections" ON public.managed_building_inspections;
CREATE POLICY "Users can insert company building inspections" ON public.managed_building_inspections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.managed_buildings mb
      JOIN public.managed_housing_entities mhe ON mhe.id = mb.managed_entity_id
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mb.id = managed_building_inspections.building_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update company building inspections" ON public.managed_building_inspections;
CREATE POLICY "Users can update company building inspections" ON public.managed_building_inspections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.managed_buildings mb
      JOIN public.managed_housing_entities mhe ON mhe.id = mb.managed_entity_id
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mb.id = managed_building_inspections.building_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete company building inspections" ON public.managed_building_inspections;
CREATE POLICY "Users can delete company building inspections" ON public.managed_building_inspections
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.managed_buildings mb
      JOIN public.managed_housing_entities mhe ON mhe.id = mb.managed_entity_id
      JOIN public.user_companies uc ON uc.company_id = mhe.manager_company_id
      WHERE mb.id = managed_building_inspections.building_id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'manager')
        AND uc.is_active = true
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.managed_building_inspections TO authenticated;
GRANT ALL ON public.managed_building_inspections TO service_role;

COMMIT;
