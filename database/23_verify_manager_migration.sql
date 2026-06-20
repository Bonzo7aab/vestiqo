-- =============================================
-- VERIFY MANAGER MIGRATION
-- =============================================
-- Verification queries to ensure data integrity and completeness
-- Note: queries using get_managers_for_browse() / manager_browse_view were removed with
-- supabase/migrations/20260611140000_drop_unused_schema.sql — use direct companies queries instead.

-- 1. Count managers by organization type
SELECT 
    COALESCE(manager_data->>'organization_type', type) as organization_type,
    COUNT(*) as count
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
GROUP BY COALESCE(manager_data->>'organization_type', type)
ORDER BY count DESC;

-- 2. Check all required fields are populated
SELECT 
    name,
    city,
    founded_year,
    is_verified,
    verification_level,
    (manager_data IS NOT NULL AND manager_data != '{}'::jsonb) as has_manager_data,
    (experience_data IS NOT NULL AND experience_data != '{}'::jsonb) as has_experience_data,
    (stats_data IS NOT NULL AND stats_data != '{}'::jsonb) as has_stats_data
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
ORDER BY name;

-- 3. Verify ratings data is present
SELECT 
    c.name,
    cr.average_rating,
    cr.total_reviews,
    cr.rating_breakdown,
    cr.category_ratings
FROM companies c
LEFT JOIN company_ratings cr ON c.id = cr.company_id
WHERE c.type IN ('property_management', 'housing_association', 'cooperative', 
                 'condo_management', 'spółdzielnia', 'wspólnota')
ORDER BY c.name;

-- 4. Test browse function with various filters
-- Test 1: All managers
SELECT 
    id,
    name,
    organization_type,
    city,
    rating,
    review_count,
    buildings_count,
    units_count
FROM get_managers_for_browse()
ORDER BY rating DESC;

-- Test 2: Filter by city
SELECT 
    id,
    name,
    city,
    rating
FROM get_managers_for_browse(city_filter := 'Warszawa');

-- Test 3: Filter by organization type
SELECT 
    id,
    name,
    organization_type,
    rating
FROM get_managers_for_browse(organization_type_filter := 'wspólnota');

-- Test 4: Search query
SELECT 
    id,
    name,
    rating
FROM get_managers_for_browse(search_query := 'parkowe');

-- Test 5: Sort by buildings
SELECT 
    id,
    name,
    buildings_count,
    units_count
FROM get_managers_for_browse(sort_by := 'buildings')
LIMIT 5;

-- Test 6: Sort by units
SELECT 
    id,
    name,
    buildings_count,
    units_count
FROM get_managers_for_browse(sort_by := 'units')
LIMIT 5;

-- Test 7: Sort by experience
SELECT 
    id,
    name,
    years_active,
    published_jobs,
    completed_projects
FROM get_managers_for_browse(sort_by := 'experience')
LIMIT 5;

-- 5. Validate JSONB data structure
SELECT 
    name,
    manager_data->>'organization_type' as org_type,
    (manager_data->>'buildings_count')::integer as buildings,
    (manager_data->>'units_count')::integer as units,
    (manager_data->'primary_needs')::jsonb as primary_needs,
    (manager_data->'frequent_services')::jsonb as frequent_services
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
ORDER BY name;

-- 6. Check experience data
SELECT 
    name,
    (experience_data->>'years_active')::integer as years_active,
    (experience_data->>'published_jobs')::integer as published_jobs,
    (experience_data->>'completed_projects')::integer as completed_projects,
    (experience_data->>'active_contractors')::integer as active_contractors
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
ORDER BY name;

-- 7. Check stats data
SELECT 
    name,
    stats_data->>'average_response_time' as response_time,
    (stats_data->>'payment_punctuality')::integer as payment_punctuality,
    (stats_data->>'project_completion_rate')::integer as completion_rate,
    (stats_data->>'contractor_retention_rate')::integer as retention_rate
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
ORDER BY name;

-- 8. Verify manager browse view
SELECT 
    name,
    city,
    organization_type,
    rating,
    review_count,
    buildings_count,
    units_count,
    years_active
FROM manager_browse_view
ORDER BY rating DESC;

-- 9. Check for any missing data
SELECT 
    'Companies without manager_data' as check_type,
    COUNT(*) as count
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
  AND (manager_data IS NULL OR manager_data = '{}'::jsonb)

UNION ALL

SELECT 
    'Companies without experience_data' as check_type,
    COUNT(*) as count
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
  AND (experience_data IS NULL OR experience_data = '{}'::jsonb)

UNION ALL

SELECT 
    'Companies without stats_data' as check_type,
    COUNT(*) as count
FROM companies
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota')
  AND (stats_data IS NULL OR stats_data = '{}'::jsonb)

UNION ALL

SELECT 
    'Managers without ratings' as check_type,
    COUNT(*) as count
FROM companies c
LEFT JOIN company_ratings cr ON c.id = cr.company_id
WHERE c.type IN ('property_management', 'housing_association', 'cooperative', 
                 'condo_management', 'spółdzielnia', 'wspólnota')
  AND cr.company_id IS NULL;

-- 10. Summary statistics
SELECT 
    COUNT(*) as total_managers,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_managers,
    COUNT(CASE WHEN plan_type = 'premium' THEN 1 END) as premium_managers,
    ROUND(AVG(COALESCE(cr.average_rating, 0)), 2) as avg_rating,
    SUM(COALESCE(manager_data->>'buildings_count', '0')::integer) as total_buildings,
    SUM(COALESCE(manager_data->>'units_count', '0')::integer) as total_units,
    COUNT(DISTINCT city) as cities
FROM companies c
LEFT JOIN company_ratings cr ON c.id = cr.company_id
WHERE c.type IN ('property_management', 'housing_association', 'cooperative', 
                 'condo_management', 'spółdzielnia', 'wspólnota');
