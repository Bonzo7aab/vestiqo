-- =============================================
-- CONTRACTOR PROFILES EXTENSION
-- =============================================
-- Extends companies table with contractor-specific profile data
-- Uses JSONB for flexible data storage while maintaining performance

-- Add contractor profile columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'basic' CHECK (plan_type IN ('basic', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- Add JSONB columns for structured contractor data
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS insurance_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stats_data JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_plan_type ON companies(plan_type);
CREATE INDEX IF NOT EXISTS idx_companies_last_active ON companies(last_active);
CREATE INDEX IF NOT EXISTS idx_companies_profile_data ON companies USING GIN(profile_data);
CREATE INDEX IF NOT EXISTS idx_companies_experience_data ON companies USING GIN(experience_data);

-- contractor_browse_view + get_contractors_for_browse removed 2026-06-11 (supabase/migrations/20260611140000_drop_unused_schema.sql)

-- Browse query indexes (app uses direct companies queries)
CREATE INDEX IF NOT EXISTS idx_contractor_browse_city ON companies(city) WHERE type = 'contractor';
CREATE INDEX IF NOT EXISTS idx_contractor_browse_verified ON companies(is_verified) WHERE type = 'contractor';
CREATE INDEX IF NOT EXISTS idx_contractor_browse_rating ON company_ratings(average_rating);

-- Add trigger to update last_active when company is updated
CREATE OR REPLACE FUNCTION update_contractor_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contractor_last_active_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW
    WHEN (NEW.type = 'contractor')
    EXECUTE FUNCTION update_contractor_last_active();
