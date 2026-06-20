-- =============================================
-- MANAGER PROFILES EXTENSION
-- =============================================
-- Extends companies table with manager-specific profile data
-- Uses JSONB for flexible data storage while maintaining performance

-- Note: columns like avatar_url, cover_image_url, plan_type, last_active, profile_data, 
-- experience_data, insurance_data, stats_data already exist from contractor_profiles migration
-- If this migration runs before 14_contractor_profiles.sql, add them here

-- Drop existing trigger if re-running (browse view/RPC removed 2026-06-11)
DROP TRIGGER IF EXISTS update_manager_last_active_trigger ON companies;
DROP FUNCTION IF EXISTS update_manager_last_active();

-- Add manager-specific JSONB columns
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS manager_data JSONB DEFAULT '{}';
-- Note: stats_data, experience_data already exist from 14_contractor_profiles.sql

-- Add indexes for performance (if not already exist)
CREATE INDEX IF NOT EXISTS idx_companies_plan_type ON companies(plan_type);
CREATE INDEX IF NOT EXISTS idx_companies_last_active ON companies(last_active);
CREATE INDEX IF NOT EXISTS idx_companies_manager_data ON companies USING GIN(manager_data);
CREATE INDEX IF NOT EXISTS idx_companies_stats_data ON companies USING GIN(stats_data);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type) WHERE type IN (
    'property_management', 'housing_association', 'cooperative', 'condo_management', 
    'spółdzielnia', 'wspólnota'
);

-- manager_browse_view + get_managers_for_browse removed 2026-06-11 (supabase/migrations/20260611140000_drop_unused_schema.sql)

-- Browse query indexes (app uses direct companies queries)
CREATE INDEX IF NOT EXISTS idx_manager_browse_city ON companies(city) 
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota');
CREATE INDEX IF NOT EXISTS idx_manager_browse_verified ON companies(is_verified) 
WHERE type IN ('property_management', 'housing_association', 'cooperative', 
               'condo_management', 'spółdzielnia', 'wspólnota');
CREATE INDEX IF NOT EXISTS idx_manager_browse_rating ON company_ratings(average_rating);

-- Add trigger to update last_active when company is updated (managers)
CREATE OR REPLACE FUNCTION update_manager_last_active()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type IN ('property_management', 'housing_association', 'cooperative', 
                    'condo_management', 'spółdzielnia', 'wspólnota') THEN
        NEW.last_active = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_manager_last_active_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW
    WHEN (NEW.type IN ('property_management', 'housing_association', 'cooperative', 
                       'condo_management', 'spółdzielnia', 'wspólnota'))
    EXECUTE FUNCTION update_manager_last_active();
