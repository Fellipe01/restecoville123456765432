-- Migration 023: Remove public access to deliverers table (exposes password_hash)
-- The login API route now uses the admin client (service role), so anon SELECT is not needed.

-- Drop the policy that let anon read all columns including password_hash
DROP POLICY IF EXISTS "public_select_deliverers" ON deliverers;

-- No replacement needed: login goes through /api/entregador/login which uses service role key.
-- Other routes that need to check a deliverer's name/status use the authenticated user context.
