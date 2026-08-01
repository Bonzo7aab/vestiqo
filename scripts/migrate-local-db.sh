#!/bin/bash

# Migration script for local Supabase database
# Applies legacy SQL from database/ directory to local Supabase.
#
# Preferred for schema parity with cloud test/prod:
#   npm run supabase:reset
# which applies supabase/migrations/ (canonical). Use this script only when you
# explicitly need the older database/*.sql path (may drift from cloud).
#
# See docs/environments.md

set -e

echo "🔄 Applying legacy database/*.sql migrations to local Supabase..."
echo "   Tip: prefer 'npm run supabase:reset' for supabase/migrations/ parity."

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if Supabase is running and get database URL
STATUS_OUTPUT=$(supabase status 2>&1)
if [ $? -ne 0 ] || echo "$STATUS_OUTPUT" | grep -q "not running\|not found\|stopped"; then
    echo "❌ Local Supabase is not running. Please run: npm run supabase:start"
    exit 1
fi

# Try to get database URL from status output
# Try JSON format first
DB_URL=$(echo "$STATUS_OUTPUT" | grep -o '"DB URL": "[^"]*' | cut -d'"' -f4 2>/dev/null)

# If JSON parsing failed, try pretty format
if [ -z "$DB_URL" ]; then
    DB_URL=$(echo "$STATUS_OUTPUT" | grep -i "DB URL" | sed -n 's/.*DB URL[[:space:]]*:[[:space:]]*\([^[:space:]]*\).*/\1/p' | head -1)
fi

# If still empty, try to construct from default local connection
if [ -z "$DB_URL" ]; then
    # Default local Supabase connection string
    DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    echo "⚠️  Using default database URL. If this doesn't work, check 'supabase status' output."
fi

echo "📊 Using database: ${DB_URL%%@*}" # Show only user@host part for security

echo "📦 Applying migrations from database/ directory..."

# List of migration files in order (based on README.md)
MIGRATIONS=(
    "01_core_tables.sql"
    "02_communication.sql"
    "03_file_management.sql"
    "04_security_policies.sql"
    "05_sample_data.sql"
    "08_comprehensive_job_tender_data.sql"
    "09_fix_company_insert_policy.sql"
    "26_buildings_table.sql"
    "27_add_building_images.sql"
    "28_building_images_storage.sql"
    "29_fix_company_buildings_rls.sql"
    "30_fix_building_images_storage_rls.sql"
    "31_job_attachments_storage.sql"
    "32_verification_documents_storage.sql"
    "33_add_company_is_public.sql"
    "34_update_company_rls_for_public_profiles.sql"
    "35_fix_portfolio_projects_rls.sql"
    "36_fix_storage_rls_for_portfolio.sql"
    "37_add_cancelled_status.sql"
    "38_allow_contractors_cancel_bids_applications.sql"
    "39_service_pricing.sql"
    "40_update_application_counts.sql"
    # Auth/admin follow-ups (avoid 51_* because it hard-codes a specific admin email)
    "49_contractor_account_settings_and_offer_feedback.sql"
    "50_admin_panel_kan8.sql"
    "52_user_read_own_verification_decisions.sql"
    "53_verification_document_reviews.sql"
    "58_platform_registration_settings.sql"
    "60_harden_system_write_policies.sql"
)

# Check if psql is available
if command -v psql &> /dev/null; then
    echo "Using psql to apply migrations..."
    for migration in "${MIGRATIONS[@]}"; do
        if [ -f "database/$migration" ]; then
            echo "  → Applying $migration..."
            psql "$DB_URL" -f "database/$migration" 2>&1 | grep -v "NOTICE:" || {
                echo "⚠️  Warning: Migration $migration had errors (this might be expected if already applied)"
            }
        else
            echo "  ⚠️  Skipping $migration (file not found)"
        fi
    done
else
    echo "⚠️  psql not found."
    echo ""
    echo "Option 1: Install PostgreSQL client (recommended)"
    echo "   macOS: brew install postgresql"
    echo ""
    echo "Option 2: Apply migrations manually via Supabase Studio"
    echo "   Studio URL: http://localhost:54323"
    echo "   Go to SQL Editor and run each migration file in order:"
    echo ""
    for migration in "${MIGRATIONS[@]}"; do
        if [ -f "database/$migration" ]; then
            echo "   - database/$migration"
        fi
    done
    echo ""
    echo "Option 3: Use Supabase CLI db execute (if available)"
    echo "   You can try: supabase db execute < database/01_core_tables.sql"
    exit 1
fi

echo ""
echo "✅ Migration process complete!"
echo ""
echo "💡 Tip: You can verify the setup by running:"
echo "   npm run supabase:verify"

