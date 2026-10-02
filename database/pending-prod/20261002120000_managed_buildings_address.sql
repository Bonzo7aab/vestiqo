-- Address fields on managed_buildings (Zarząd Wspólnoty adds buildings by address)

BEGIN;

ALTER TABLE public.managed_buildings
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

COMMIT;
