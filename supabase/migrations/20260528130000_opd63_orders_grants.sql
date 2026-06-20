-- OPD-63: Ensure API roles can access orders (fixes empty PostgREST errors when grants missing)

GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.orders TO service_role;

-- Refresh PostgREST schema cache after orders table creation
NOTIFY pgrst, 'reload schema';
