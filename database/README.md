# Domio Database Setup Guide

## Overview

This directory contains SQL migrations for setting up the Domio platform database on Supabase.

**Table usage, unused schema, and legacy naming:** see [SCHEMA_INVENTORY.md](./SCHEMA_INVENTORY.md).

**New prod migrations:** add to [`pending-prod/`](./pending-prod/) until applied; canonical history in [`supabase/migrations/`](../supabase/migrations/) (queue empty as of 2026-06-20).

## Migration Order

Execute these SQL files **in order** in your Supabase SQL Editor:

### Core Structure

1. **01_core_tables.sql**
   - User profiles and companies
   - Subscription management
   - Job categories
   - Jobs and tenders tables
   - Trust and verification system
   - Indexes and triggers

2. **02_communication.sql**
   - Messages system
   - Notifications
   - Communication preferences

3. **03_file_management.sql**
   - File attachments
   - Document management
   - Storage integration

4. **04_security_policies.sql**
   - Row Level Security (RLS) policies
   - Access control
   - Data protection

### Sample Data

5. **05_sample_data.sql**
   - Subscription plans (Free, Basic, Pro)
   - Job categories and subcategories
   - Certificate categories

6. **08_comprehensive_job_tender_data.sql** ⭐ **NEW**
   - 8 Companies with full details
   - 5 Regular jobs (including premium and urgent)
   - 3 Tenders with evaluation criteria
   - Complete mock data migration from frontend

7. **09_fix_company_insert_policy.sql** 🔒 **SECURITY FIX - REQUIRED**
   - Adds missing INSERT policy for companies table
   - Adds DELETE policy for company owners
   - **Must run this to enable company creation in account settings**

### Auth & Platform Security Updates

For current auth/administracja flows, also apply these later migrations:

- **49_contractor_account_settings_and_offer_feedback.sql**
- **50_admin_panel_kan8.sql**
- **52_user_read_own_verification_decisions.sql**
- **53_verification_document_reviews.sql**
- **58_platform_registration_settings.sql**
- **60_harden_system_write_policies.sql** 🔒
- **61_rename_job_bookmarks_to_bookmarks.sql** — polymorphic `bookmarks` table
- **62_fix_bookmarks_count_triggers.sql** — drop legacy bookmark count triggers
- **Supabase migrations:** [`supabase/migrations/`](../supabase/migrations/) — includes drop-unused schema, tenders→contests rename, OPD-41/105/106, VAT whitelist

> Note: `51_grant_platform_admin_by_email.sql` is environment-specific (hard-coded email)
> and should be run manually only when intentionally granting admin access.

## Quick Start

### Option 1: Supabase Dashboard

1. Open your Supabase project
2. Navigate to **SQL Editor**
3. Create new query for each file
4. Copy-paste content from files 1-6 in order
5. Execute each query

### Option 2: Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Or run individually
psql $DATABASE_URL < database/01_core_tables.sql
psql $DATABASE_URL < database/02_communication.sql
# ... continue for all files
```

## What's Included in Sample Data

### Companies (8)
- Spółdzielnia Mieszkaniowa "Panorama" (Gdańsk) - Verified
- Wspólnota Mieszkaniowa "Zielone Osiedle" (Warszawa) - Verified
- Spółdzielnia Mieszkaniowa "Sosnowy Las" (Kraków) - Verified
- Wspólnota Mieszkaniowa "Słoneczna" (Warszawa) - Verified
- Wspólnota Mieszkaniowa ul. Parkowa 24 (Kraków) - Basic
- Wspólnota Mieszkaniowa "Centrum" (Gdańsk) - Verified
- Wspólnota Mieszkaniowa "Stary Rynek" (Poznań) - Premium
- Wspólnota "Złota" (Wrocław) - Verified

### Regular Jobs (5)

| ID | Title | Location | Type | Budget | Status |
|----|-------|----------|------|---------|--------|
| job-new-1 | Elevator Service | Gdańsk | Premium | 8-12k PLN/mo | Active |
| job-new-2 | Pest Control | Warszawa | Urgent | 5.4-7.8k PLN | Active |
| job-new-3 | Fence Replacement | Kraków | Premium | 42-56k PLN | Active |
| 1 | Staircase Cleaning | Warszawa | Regular | 2.5-3k PLN/mo | Active |
| 2 | Facade Renovation | Kraków | Urgent | 64-96k PLN | Active |

### Tenders (3)

| ID | Title | Location | Value | Deadline | Status |
|----|-------|----------|-------|----------|--------|
| tender-1 | Thermal Modernization | Warszawa | 850k PLN | +30 days | Active |
| tender-2 | Elevator Modernization | Gdańsk | 420k PLN | +25 days | Active |
| tender-3 | Roof Renovation | Poznań | 280k PLN | +20 days | Active |

## Verification

After running all migrations, verify your setup:

```sql
-- Check companies
SELECT name, type, city, is_verified FROM companies ORDER BY created_at;

-- Check jobs
SELECT title, location, budget_min, budget_max, status, urgency, type 
FROM jobs 
WHERE status = 'active' 
ORDER BY created_at DESC;

-- Check tenders
SELECT title, location, estimated_value, submission_deadline, status 
FROM tenders 
WHERE status = 'active' 
ORDER BY created_at DESC;

-- Check job categories
SELECT name, parent_id, sort_order FROM job_categories ORDER BY sort_order;

-- Count everything
SELECT 
  (SELECT COUNT(*) FROM companies) as companies_count,
  (SELECT COUNT(*) FROM jobs WHERE status = 'active') as active_jobs_count,
  (SELECT COUNT(*) FROM tenders WHERE status = 'active') as active_tenders_count,
  (SELECT COUNT(*) FROM job_categories WHERE parent_id IS NULL) as main_categories_count,
  (SELECT COUNT(*) FROM job_categories WHERE parent_id IS NOT NULL) as subcategories_count;
```

Expected results:
- 8 companies
- 5 active jobs
- 3 active tenders
- 5 main categories
- ~25 subcategories

## Troubleshooting

### Error: relation "companies" already exists
The tables already exist. Either:
1. Drop existing tables: `DROP TABLE IF EXISTS companies CASCADE;`
2. Skip to sample data migrations (files 5-6)

### Error: duplicate key value violates unique constraint
Data already exists. Either:
1. Clear existing data: `TRUNCATE TABLE jobs, tenders CASCADE;`
2. Skip the migration

### Error: foreign key constraint violation
Migrations run out of order. Start from file 1.

### No data showing in app
1. Check data exists: Run verification queries above
2. Check RLS policies: Ensure policies allow reads
3. Check Supabase credentials in `.env.local`
4. Check browser console for API errors

## Updating Data

### Add More Jobs
```sql
INSERT INTO jobs (title, description, category_id, manager_id, company_id, ...)
VALUES (...);
```

### Update Existing Job
```sql
UPDATE jobs 
SET status = 'completed', updated_at = NOW()
WHERE id = 'job-new-1';
```

### Add More Companies
```sql
INSERT INTO companies (name, type, city, ...)
VALUES (...);
```

## Database Schema

See `01_core_tables.sql` for complete schema documentation including:
- Table structures
- Relationships
- Constraints
- Indexes
- Triggers

## Security

All tables have Row Level Security (RLS) enabled. See `04_security_policies.sql` for:
- Public read access for active jobs/tenders
- Manager-only write access for their jobs
- Contractor read access
- Admin full access

## Backup

Always backup before running migrations in production:

```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump
pg_dump $DATABASE_URL > backup.sql
```

## Next Steps

1. ✅ Run migrations
2. ✅ Verify data
3. ✅ Test app connection
4. 🔄 Update frontend to use database (in progress)
5. 📝 Add real user authentication
6. 🎨 Create admin interface for data management

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Domio DATABASE_INTEGRATION.md](../DATABASE_INTEGRATION.md)
