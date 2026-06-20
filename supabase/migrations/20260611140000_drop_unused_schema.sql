-- Drop unused schema (14 tables + 2 browse views + 2 RPCs).
-- Preflight verified 2026-06-11: no inbound FKs from used tables; no app .from() queries;
-- pg_cron jobs touch jobs/tenders only; no Supabase edge functions in repo.
-- Prod/test row counts were small (max 10 rows in certificate_categories).

DO $$
DECLARE
  tbl text;
  cnt bigint;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'subscription_plans','user_subscriptions','activity_logs','user_feedback',
    'support_tickets','support_ticket_messages','image_galleries','document_templates',
    'shared_files','storage_quotas','company_storage_quotas','certificate_categories',
    'certificate_templates','file_processing_queue'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', tbl) INTO cnt;
      RAISE NOTICE 'drop_unused_schema: % has % rows', tbl, cnt;
    ELSE
      RAISE NOTICE 'drop_unused_schema: % already absent', tbl;
    END IF;
  END LOOP;
END $$;

-- Browse RPCs + views (app queries companies directly; see database/SCHEMA_INVENTORY.md)
DROP FUNCTION IF EXISTS public.get_contractors_for_browse(text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_managers_for_browse(text, text, text, text, integer, integer);
DROP VIEW IF EXISTS public.contractor_browse_view;
DROP VIEW IF EXISTS public.manager_browse_view;

-- Child tables first, then parents (CASCADE for policies/triggers)
DROP TABLE IF EXISTS public.support_ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.certificate_templates CASCADE;
DROP TABLE IF EXISTS public.certificate_categories CASCADE;
DROP TABLE IF EXISTS public.image_galleries CASCADE;
DROP TABLE IF EXISTS public.shared_files CASCADE;
DROP TABLE IF EXISTS public.file_processing_queue CASCADE;
DROP TABLE IF EXISTS public.storage_quotas CASCADE;
DROP TABLE IF EXISTS public.company_storage_quotas CASCADE;
DROP TABLE IF EXISTS public.document_templates CASCADE;
DROP TABLE IF EXISTS public.user_feedback CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

NOTIFY pgrst, 'reload schema';
