-- Fix browse/listing queries that embed job_categories (homepage map, contest detail).
-- 20260624120000_prod_security_rls_hardening enabled RLS but did not recreate SELECT policies.

DROP POLICY IF EXISTS "Job categories are publicly readable" ON public.job_categories;
CREATE POLICY "Job categories are publicly readable" ON public.job_categories
  FOR SELECT
  USING (true);

-- Public contest listings embed company name/logo for anonymous visitors.
DROP POLICY IF EXISTS "Anyone can view public companies" ON public.companies;
CREATE POLICY "Anyone can view public companies" ON public.companies
  FOR SELECT
  USING (is_public = true);

-- Public contests are visible on the homepage without signing in.
DROP POLICY IF EXISTS "Anyone can view public contests" ON public.contests;
CREATE POLICY "Anyone can view public contests" ON public.contests
  FOR SELECT
  USING (is_public = true);
