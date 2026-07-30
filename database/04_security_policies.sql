-- =============================================
-- DOMIO PLATFORM - SECURITY POLICIES (RLS)
-- =============================================

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_housing_entities ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER PROFILES POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Public profiles can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public profiles" ON user_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- COMPANIES POLICIES
-- =============================================

-- Users can view companies they're associated with
CREATE POLICY "Users can view their companies" ON companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = companies.id 
            AND user_id = auth.uid()
        )
    );

-- Users can update companies they're associated with
CREATE POLICY "Users can update their companies" ON companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = companies.id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- Public companies can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public companies" ON companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert companies (they'll be associated via user_companies)
CREATE POLICY "Users can insert companies" ON companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =============================================
-- USER COMPANIES POLICIES
-- =============================================

-- Users can view their company relationships
CREATE POLICY "Users can view their company relationships" ON user_companies
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own company relationships
CREATE POLICY "Users can insert their own company relationships" ON user_companies
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own company relationships
CREATE POLICY "Users can update their own company relationships" ON user_companies
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- JOB CATEGORIES POLICIES
-- =============================================

-- Job categories are publicly readable
CREATE POLICY "Job categories are publicly readable" ON job_categories
    FOR SELECT USING (true);

-- =============================================
-- JOBS POLICIES
-- =============================================

-- Public jobs can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public jobs" ON jobs
    FOR SELECT USING (auth.role() = 'authenticated' AND is_public = true);

-- Users can view jobs they created
CREATE POLICY "Users can view their own jobs" ON jobs
    FOR SELECT USING (manager_id = auth.uid());

-- Users can insert jobs
CREATE POLICY "Users can insert jobs" ON jobs
    FOR INSERT WITH CHECK (manager_id = auth.uid());

-- Users can update their own jobs
CREATE POLICY "Users can update their own jobs" ON jobs
    FOR UPDATE USING (manager_id = auth.uid());

-- Users can delete their own jobs
CREATE POLICY "Users can delete their own jobs" ON jobs
    FOR DELETE USING (manager_id = auth.uid());

-- =============================================
-- CONTESTS POLICIES
-- =============================================

-- Public contests can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public contests" ON contests
    FOR SELECT USING (auth.role() = 'authenticated' AND is_public = true);

-- Users can view contests they created
CREATE POLICY "Users can view their own contests" ON contests
    FOR SELECT USING (manager_id = auth.uid());

-- Users can insert contests
CREATE POLICY "Users can insert contests" ON contests
    FOR INSERT WITH CHECK (manager_id = auth.uid());

-- Users can update their own contests
CREATE POLICY "Users can update their own contests" ON contests
    FOR UPDATE USING (manager_id = auth.uid());

-- Users can delete their own contests
CREATE POLICY "Users can delete their own contests" ON contests
    FOR DELETE USING (manager_id = auth.uid());

-- =============================================
-- JOB APPLICATIONS POLICIES
-- =============================================

-- Users can view applications they submitted
CREATE POLICY "Users can view their own applications" ON job_applications
    FOR SELECT USING (contractor_id = auth.uid());

-- Users can view applications for their jobs
CREATE POLICY "Job owners can view applications" ON job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.manager_id = auth.uid()
        )
    );

-- Users can insert applications
CREATE POLICY "Users can submit applications" ON job_applications
    FOR INSERT WITH CHECK (contractor_id = auth.uid());

-- Job owners can update application status
CREATE POLICY "Job owners can update application status" ON job_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.manager_id = auth.uid()
        )
    );

-- =============================================
-- CONTEST OFFERS POLICIES
-- =============================================

-- Users can view offers they submitted
CREATE POLICY "Users can view their own bids" ON contest_offers
    FOR SELECT USING (contractor_id = auth.uid());

-- Contest owners can view offers on their contests
CREATE POLICY "Contest owners can view offers" ON contest_offers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contests
            WHERE contests.id = contest_offers.contest_id
            AND contests.manager_id = auth.uid()
        )
    );

-- Users can submit contest offers
CREATE POLICY "Users can submit contest offers" ON contest_offers
    FOR INSERT WITH CHECK (contractor_id = auth.uid());

-- Contest owners can update offer status
CREATE POLICY "Contest owners can update offer status" ON contest_offers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM contests
            WHERE contests.id = contest_offers.contest_id
            AND contests.manager_id = auth.uid()
        )
    );

-- Contractors can delete their own draft offers (abandon draft)
CREATE POLICY "Contractors can delete their own draft offers" ON contest_offers
    FOR DELETE USING (
        contractor_id = auth.uid()
        AND status = 'draft'
    );

-- =============================================
-- CERTIFICATES POLICIES
-- =============================================

-- Users can view certificates for companies they're associated with
CREATE POLICY "Users can view company certificates" ON certificates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = certificates.company_id 
            AND user_id = auth.uid()
        )
    );

-- Users can insert certificates for their companies
CREATE POLICY "Users can insert company certificates" ON certificates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = certificates.company_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- Users can update certificates for their companies
CREATE POLICY "Users can update company certificates" ON certificates
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = certificates.company_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- Public certificates can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public certificates" ON certificates
    FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- COMPANY REVIEWS POLICIES
-- =============================================

-- Public reviews can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public reviews" ON company_reviews
    FOR SELECT USING (auth.role() = 'authenticated' AND is_public = true);

-- Users can view reviews they wrote
CREATE POLICY "Users can view their own reviews" ON company_reviews
    FOR SELECT USING (reviewer_id = auth.uid());

-- Users can view reviews for their companies
CREATE POLICY "Users can view reviews for their companies" ON company_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = company_reviews.company_id 
            AND user_id = auth.uid()
        )
    );

-- Users can insert reviews
CREATE POLICY "Users can insert reviews" ON company_reviews
    FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON company_reviews
    FOR UPDATE USING (reviewer_id = auth.uid());

-- =============================================
-- COMPANY RATINGS POLICIES
-- =============================================

-- Company ratings are publicly readable
CREATE POLICY "Company ratings are publicly readable" ON company_ratings
    FOR SELECT USING (true);

-- =============================================
-- CONVERSATIONS POLICIES
-- =============================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Users can insert conversations they participate in
CREATE POLICY "Users can insert conversations" ON conversations
    FOR INSERT WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Users can update conversations they participate in
CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- =============================================
-- MESSAGES POLICIES
-- =============================================

-- Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

-- Users can insert messages in conversations they participate in
CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND (participant_1 = auth.uid() OR participant_2 = auth.uid())
        )
    );

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE USING (sender_id = auth.uid());

-- =============================================
-- MESSAGE READ STATUS POLICIES
-- =============================================

-- Participants can see read status for messages in their conversations (incl. recipient reads)
CREATE POLICY "Participants can view read status in their conversations" ON message_read_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m
            INNER JOIN conversations c ON c.id = m.conversation_id
            WHERE m.id = message_read_status.message_id
            AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
        )
    );

-- Users can insert read status for their messages
CREATE POLICY "Users can insert message read status" ON message_read_status
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update read status for their messages
CREATE POLICY "Users can update message read status" ON message_read_status
    FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- NOTIFICATIONS POLICIES
-- =============================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        is_admin() OR
        user_id = auth.uid()
    );

-- =============================================
-- NOTIFICATION PREFERENCES POLICIES
-- =============================================

-- Users can view their own notification preferences
CREATE POLICY "Users can view their notification preferences" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notification preferences
CREATE POLICY "Users can update their notification preferences" ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own notification preferences
CREATE POLICY "Users can insert their notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- QUESTIONS POLICIES
-- =============================================

-- OPD-70: Contractors use list_contest_questions_contractor RPC for published Q&A (anonymous).
-- Direct SELECT: asker sees own rows; managers see all rows on their listings.

CREATE POLICY "Users can view their own questions" ON questions
    FOR SELECT USING (asker_id = auth.uid());

CREATE POLICY "Managers can view questions on their contests" ON questions
    FOR SELECT USING (
        contest_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM contests c
            WHERE c.id = questions.contest_id AND c.manager_id = auth.uid()
        )
    );

CREATE POLICY "Managers can view questions on their jobs" ON questions
    FOR SELECT USING (
        job_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM jobs j
            WHERE j.id = questions.job_id AND j.manager_id = auth.uid()
        )
    );

-- Users can insert questions
CREATE POLICY "Users can insert questions" ON questions
    FOR INSERT WITH CHECK (asker_id = auth.uid());

-- Users can update questions they asked
CREATE POLICY "Users can update their own questions" ON questions
    FOR UPDATE USING (asker_id = auth.uid());

-- Job/contest owners can answer questions
CREATE POLICY "Job/contest owners can answer questions" ON questions
    FOR UPDATE USING (
        answered_by = auth.uid() OR
        (job_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM jobs WHERE jobs.id = questions.job_id AND jobs.manager_id = auth.uid()
        )) OR
        (contest_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM contests WHERE contests.id = questions.contest_id AND contests.manager_id = auth.uid()
        ))
    );

-- =============================================
-- FILE UPLOADS POLICIES
-- =============================================

-- Users can view their own files
CREATE POLICY "Users can view their own files" ON file_uploads
    FOR SELECT USING (user_id = auth.uid());

-- Users can view public files
CREATE POLICY "Users can view public files" ON file_uploads
    FOR SELECT USING (is_public = true AND auth.role() = 'authenticated');

-- Users can insert files
CREATE POLICY "Users can insert files" ON file_uploads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own files
CREATE POLICY "Users can update their own files" ON file_uploads
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own files
CREATE POLICY "Users can delete their own files" ON file_uploads
    FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- PORTFOLIO PROJECTS POLICIES
-- =============================================

-- Users can view portfolio projects for companies they're associated with
CREATE POLICY "Users can view company portfolio projects" ON portfolio_projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = portfolio_projects.company_id 
            AND user_id = auth.uid()
        )
    );

-- Public portfolio projects can be viewed by authenticated users
CREATE POLICY "Authenticated users can view public portfolio projects" ON portfolio_projects
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert portfolio projects for their companies
CREATE POLICY "Users can insert portfolio projects" ON portfolio_projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = portfolio_projects.company_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- Users can update portfolio projects for their companies
CREATE POLICY "Users can update portfolio projects" ON portfolio_projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = portfolio_projects.company_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- Users can delete portfolio projects for their companies
CREATE POLICY "Users can delete portfolio projects" ON portfolio_projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_companies 
            WHERE company_id = portfolio_projects.company_id 
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
        )
    );

-- =============================================
-- PORTFOLIO PROJECT IMAGES POLICIES
-- =============================================

-- Users can view portfolio project images for projects they have access to
CREATE POLICY "Users can view portfolio project images" ON portfolio_project_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM portfolio_projects 
            WHERE id = portfolio_project_images.project_id 
            AND (
                EXISTS (
                    SELECT 1 FROM user_companies 
                    WHERE company_id = portfolio_projects.company_id 
                    AND user_id = auth.uid()
                ) OR
                auth.role() = 'authenticated'
            )
        )
    );

-- Users can insert portfolio project images for their projects
CREATE POLICY "Users can insert portfolio project images" ON portfolio_project_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM portfolio_projects 
            JOIN user_companies ON user_companies.company_id = portfolio_projects.company_id
            WHERE portfolio_projects.id = portfolio_project_images.project_id 
            AND user_companies.user_id = auth.uid()
            AND user_companies.role IN ('owner', 'manager')
        )
    );

-- Users can update portfolio project images for their projects
CREATE POLICY "Users can update portfolio project images" ON portfolio_project_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM portfolio_projects 
            JOIN user_companies ON user_companies.company_id = portfolio_projects.company_id
            WHERE portfolio_projects.id = portfolio_project_images.project_id 
            AND user_companies.user_id = auth.uid()
            AND user_companies.role IN ('owner', 'manager')
        )
    );

-- Users can delete portfolio project images for their projects
CREATE POLICY "Users can delete portfolio project images" ON portfolio_project_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM portfolio_projects 
            JOIN user_companies ON user_companies.company_id = portfolio_projects.company_id
            WHERE portfolio_projects.id = portfolio_project_images.project_id 
            AND user_companies.user_id = auth.uid()
            AND user_companies.role IN ('owner', 'manager')
        )
    );

-- =============================================
-- HELPER FUNCTIONS FOR POLICIES
-- =============================================

-- Function to check if user is admin (can be extended for admin roles)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, return false. This can be extended to check for admin roles
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns or manages a company
CREATE OR REPLACE FUNCTION user_owns_or_manages_company(company_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_companies 
        WHERE company_id = company_uuid 
        AND user_id = auth.uid()
        AND role IN ('owner', 'manager')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MANAGED HOUSING ENTITIES POLICIES
-- =============================================

CREATE POLICY "Users can view company managed housing entities" ON managed_housing_entities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can view public managed housing entities" ON managed_housing_entities
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM companies c
            WHERE c.id = managed_housing_entities.manager_company_id
            AND c.is_public = true
        )
    );

CREATE POLICY "Users can insert company managed housing entities" ON managed_housing_entities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );

CREATE POLICY "Users can update company managed housing entities" ON managed_housing_entities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );

CREATE POLICY "Users can delete company managed housing entities" ON managed_housing_entities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );
