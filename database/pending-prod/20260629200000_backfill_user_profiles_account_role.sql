-- OPD-128/129: Backfill account_role for profiles created before registration captured it.

UPDATE public.user_profiles up
SET account_role = 'property_manager'
FROM public.user_companies uc
JOIN public.companies c ON c.id = uc.company_id
WHERE up.id = uc.user_id
  AND uc.is_primary = true
  AND up.user_type = 'manager'
  AND up.account_role IS NULL
  AND c.type IN ('property_management', 'condo_management', 'zarządca');

UPDATE public.user_profiles
SET account_role = 'contractor'
WHERE user_type = 'contractor'
  AND account_role IS NULL;

UPDATE public.user_profiles
SET account_role = 'cooperative_admin'
WHERE user_type = 'manager'
  AND account_role IS NULL
  AND organization_type = 'spółdzielnia'
  AND (
    lower(coalesce(position, '')) LIKE '%administr%'
    OR lower(coalesce(contact_person, '')) LIKE '%administr%'
  );

UPDATE public.user_profiles
SET account_role = 'cooperative_board'
WHERE user_type = 'manager'
  AND account_role IS NULL
  AND organization_type = 'spółdzielnia';

UPDATE public.user_profiles
SET account_role = 'condo_board'
WHERE user_type = 'manager'
  AND account_role IS NULL
  AND organization_type = 'wspólnota';

UPDATE public.user_profiles
SET account_role = 'condo_board'
WHERE user_type = 'manager'
  AND account_role IS NULL;
