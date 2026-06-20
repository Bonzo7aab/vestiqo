-- =============================================
-- DOMIO PLATFORM - COMMUNICATION SYSTEM
-- =============================================

-- =============================================
-- MESSAGING SYSTEM
-- =============================================

-- Conversations between users
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
    contest_offer_id UUID REFERENCES contest_offers(id) ON DELETE CASCADE,
    participant_1 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    participant_2 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    last_message_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure participants are different
    CHECK (participant_1 != participant_2)
);

-- Messages within conversations
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN (
        'text', 'image', 'document', 'system', 'quote'
    )),
    attachments JSONB,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message read status per user
CREATE TABLE message_read_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- =============================================
-- NOTIFICATION SYSTEM
-- =============================================

-- Notification types enum
CREATE TYPE notification_type AS ENUM (
    'new_job',
    'new_tender', 
    'application_received',
    'bid_received',
    'application_status_update',
    'bid_status_update',
    'job_assigned',
    'tender_awarded',
    'new_message',
    'review_received',
    'certificate_expiring',
    'deadline_reminder',
    'system_announcement',
    'subscription_expiring',
    'payment_failed',
    'verification_approved',
    'verification_rejected',
    'profile_completion_reminder',
    'contest_question'
);

-- User notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional context data
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT, -- URL to navigate when notification is clicked
    expires_at TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences per user
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    -- Per-type preferences
    new_job_notifications BOOLEAN DEFAULT TRUE,
    new_tender_notifications BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    status_update_notifications BOOLEAN DEFAULT TRUE,
    reminder_notifications BOOLEAN DEFAULT TRUE,
    marketing_notifications BOOLEAN DEFAULT FALSE,
    system_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =============================================
-- ACTIVITY LOGGING — removed 2026-06-11 (see supabase/migrations/20260611140000_drop_unused_schema.sql)
-- =============================================

-- =============================================
-- Q&A SYSTEM
-- =============================================

-- Questions about jobs/contests
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    contest_id UUID REFERENCES contests(id) ON DELETE CASCADE,
    asker_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    answer TEXT,
    answered_by UUID REFERENCES user_profiles(id),
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- FEEDBACK AND SUPPORT — removed 2026-06-11 (see supabase/migrations/20260611140000_drop_unused_schema.sql)
-- =============================================

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Conversations indexes
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX idx_conversations_job ON conversations(job_id);
CREATE INDEX idx_conversations_contest ON conversations(contest_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Questions indexes
CREATE INDEX idx_questions_job ON questions(job_id);
CREATE INDEX idx_questions_contest ON questions(contest_id);
CREATE INDEX idx_questions_asker ON questions(asker_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
