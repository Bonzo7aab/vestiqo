-- =============================================
-- DOMIO PLATFORM - CORE TABLES
-- =============================================
-- B2B marketplace connecting property managers with contractors
-- Freemium model: Free for managers, paid plans for contractors

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================
-- USER MANAGEMENT
-- =============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('manager', 'contractor')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies/Organizations (for both managers and contractors)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'property_management', 'housing_association', 'cooperative', 
        'condo_management', 'spółdzielnia', 'wspólnota', 'contractor',
        'construction_company', 'service_provider'
    )),
    nip VARCHAR(20), -- Polish tax number
    regon VARCHAR(20), -- Polish business registry number
    krs VARCHAR(20), -- Polish court registry number
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(2) DEFAULT 'PL',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    description TEXT,
    logo_url TEXT,
    founded_year INTEGER,
    employee_count VARCHAR(50),
    license_number VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level VARCHAR(20) DEFAULT 'none' CHECK (verification_level IN (
        'none', 'basic', 'verified', 'premium'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Company relationships (many-to-many)
CREATE TABLE user_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(100), -- 'owner', 'manager', 'employee', 'representative'
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- =============================================
-- SUBSCRIPTION MANAGEMENT — removed 2026-06-11 (see supabase/migrations/20260611140000_drop_unused_schema.sql)
-- =============================================

-- =============================================
-- JOB CATEGORIES
-- =============================================

CREATE TABLE job_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100), -- Icon name for UI
    parent_id UUID REFERENCES job_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- JOBS AND CONTESTS
-- =============================================

-- Regular job postings
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES job_categories(id),
    subcategory VARCHAR(100),
    manager_id UUID NOT NULL REFERENCES user_profiles(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    location VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    budget_type VARCHAR(20) DEFAULT 'fixed' CHECK (budget_type IN (
        'fixed', 'hourly', 'negotiable', 'range'
    )),
    currency VARCHAR(3) DEFAULT 'PLN',
    project_duration VARCHAR(100),
    deadline DATE,
    urgency VARCHAR(20) DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'paused', 'completed', 'cancelled'
    )),
    type VARCHAR(20) DEFAULT 'regular' CHECK (type IN ('regular', 'urgent', 'premium')),
    is_public BOOLEAN DEFAULT TRUE,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    building_type VARCHAR(100),
    building_year INTEGER,
    surface_area VARCHAR(50),
    additional_info TEXT,
    requirements TEXT[],
    responsibilities TEXT[],
    skills_required TEXT[],
    images TEXT[],
    applications_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Contests (Konkurs)
CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES job_categories(id),
    manager_id UUID NOT NULL REFERENCES user_profiles(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    location VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    estimated_value DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
        'draft', 'active', 'evaluation', 'awarded', 'cancelled'
    )),
    submission_deadline TIMESTAMPTZ NOT NULL,
    evaluation_deadline TIMESTAMPTZ,
    project_duration VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    requirements TEXT[],
    documents JSONB,
    evaluation_criteria JSONB,
    phases JSONB, -- Contest phases if applicable
    current_phase VARCHAR(100),
    wadium DECIMAL(12,2), -- Contest deposit (wadium)
    winning_offer_id UUID,
    winner_name VARCHAR(255),
    offers_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- =============================================
-- APPLICATIONS AND BIDS
-- =============================================

-- Job applications
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES user_profiles(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    proposed_price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'PLN',
    proposed_timeline INTEGER, -- days
    proposed_start_date DATE,
    cover_letter TEXT,
    experience TEXT,
    team_size INTEGER,
    available_from DATE,
    guarantee_period INTEGER, -- months
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'
    )),
    notes TEXT,
    attachments JSONB,
    certificates TEXT[],
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    decision_at TIMESTAMPTZ
);

-- Contest offers
CREATE TABLE contest_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES user_profiles(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    bid_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
    proposed_timeline INTEGER, -- days
    proposed_start_date DATE,
    technical_proposal TEXT,
    financial_proposal TEXT,
    team_description TEXT,
    experience_summary TEXT,
    project_references TEXT[],
    certificates TEXT[],
    attachments JSONB,
    valid_until DATE,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'
    )),
    evaluation_score DECIMAL(5,2),
    evaluation_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ
);

-- =============================================
-- TRUST AND VERIFICATION
-- =============================================

-- Company certificates and licenses
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'insurance', 'license', 'certification', 'registration'
    number VARCHAR(100),
    issuer VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    file_url TEXT,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company reviews and ratings
CREATE TABLE company_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    contest_id UUID REFERENCES contests(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    categories JSONB, -- Detailed ratings by category
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company ratings summary (materialized view data)
CREATE TABLE company_ratings (
    company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    average_rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    rating_breakdown JSONB, -- Distribution of ratings (1-5 stars)
    category_ratings JSONB, -- Average ratings by category
    last_review_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_verified ON user_profiles(is_verified);

-- Companies indexes
CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_verified ON companies(is_verified);
CREATE INDEX idx_companies_city ON companies(city);

-- Jobs indexes
CREATE INDEX idx_jobs_category ON jobs(category_id);
CREATE INDEX idx_jobs_manager ON jobs(manager_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_budget ON jobs(budget_min, budget_max);
CREATE INDEX idx_jobs_deadline ON jobs(deadline);
CREATE INDEX idx_jobs_created ON jobs(created_at);

-- Contests indexes
CREATE INDEX idx_contests_category ON contests(category_id);
CREATE INDEX idx_contests_manager ON contests(manager_id);
CREATE INDEX idx_contests_status ON contests(status);
CREATE INDEX idx_contests_deadline ON contests(submission_deadline);

-- Applications indexes
CREATE INDEX idx_job_applications_job ON job_applications(job_id);
CREATE INDEX idx_job_applications_contractor ON job_applications(contractor_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);

-- Contest offers indexes
CREATE INDEX idx_contest_offers_contest ON contest_offers(contest_id);
CREATE INDEX idx_contest_offers_contractor ON contest_offers(contractor_id);
CREATE INDEX idx_contest_offers_status ON contest_offers(status);

-- Reviews indexes
CREATE INDEX idx_company_reviews_company ON company_reviews(company_id);
CREATE INDEX idx_company_reviews_reviewer ON company_reviews(reviewer_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON contests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_reviews_updated_at BEFORE UPDATE ON company_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_ratings_updated_at BEFORE UPDATE ON company_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
