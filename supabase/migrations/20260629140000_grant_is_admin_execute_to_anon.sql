-- Anonymous homepage/browse queries evaluate RLS policies that call is_admin()
-- (directly on companies, or indirectly via user_profiles subqueries on contests).
-- 20260624120000_prod_security_rls_hardening revoked EXECUTE from anon, which causes:
--   permission denied for function is_admin (42501)
-- is_admin() is SECURITY DEFINER and returns FALSE when auth.uid() IS NULL, so this
-- grant only allows policy evaluation — it does not grant admin data access.

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
