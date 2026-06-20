-- =============================================
-- DOMIO PLATFORM - FILE MANAGEMENT
-- =============================================

-- =============================================
-- FILE UPLOADS
-- =============================================

-- File uploads tracking
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN (
        'image', 'document', 'certificate', 'portfolio', 'attachment', 'logo', 'avatar'
    )),
    entity_type VARCHAR(50), -- 'job', 'tender', 'application', 'bid', 'company', 'profile', 'review'
    entity_id UUID,
    description TEXT,
    alt_text TEXT, -- For accessibility
    is_public BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    virus_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (virus_scan_status IN (
        'pending', 'clean', 'infected', 'error'
    )),
    virus_scan_result JSONB,
    metadata JSONB, -- Additional file metadata (dimensions, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Unused file extras removed 2026-06-11 — see supabase/migrations/20260611140000_drop_unused_schema.sql
-- (image_galleries, document_templates, shared_files, storage_quotas,
--  company_storage_quotas, certificate_categories, certificate_templates, file_processing_queue)
-- =============================================

-- =============================================
-- PORTFOLIO MANAGEMENT
-- =============================================

-- Portfolio projects for contractors
CREATE TABLE portfolio_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES job_categories(id),
    location VARCHAR(255),
    project_type VARCHAR(50), -- 'residential', 'commercial', 'industrial'
    budget_range VARCHAR(100),
    duration VARCHAR(100),
    completion_date DATE,
    client_name VARCHAR(255),
    client_feedback TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio project images
CREATE TABLE portfolio_project_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    alt_text TEXT,
    image_type VARCHAR(20) DEFAULT 'general' CHECK (image_type IN (
        'before', 'during', 'after', 'general', 'detail'
    )),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- File uploads indexes
CREATE INDEX idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX idx_file_uploads_type ON file_uploads(file_type);
CREATE INDEX idx_file_uploads_entity ON file_uploads(entity_type, entity_id);
CREATE INDEX idx_file_uploads_public ON file_uploads(is_public);
CREATE INDEX idx_file_uploads_created ON file_uploads(created_at);

-- Portfolio indexes
CREATE INDEX idx_portfolio_projects_company ON portfolio_projects(company_id);
CREATE INDEX idx_portfolio_projects_category ON portfolio_projects(category_id);
CREATE INDEX idx_portfolio_projects_featured ON portfolio_projects(is_featured);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_projects_updated_at BEFORE UPDATE ON portfolio_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
