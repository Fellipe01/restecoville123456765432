-- ============================================================
-- MULTI-TENANT: slug, custom_domain e restaurant_admins
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- slug: identificador público do restaurante (ex: "pizza-do-zé")
-- custom_domain: domínio próprio do cliente (ex: "pizzadoze.com.br")
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE;

-- Gera slug automático para restaurantes existentes
UPDATE restaurants
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(unaccent(name), '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

ALTER TABLE restaurants ALTER COLUMN slug SET NOT NULL;

-- ============================================================
-- RESTAURANT_ADMINS: vincula usuários Supabase a restaurantes
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_admins (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE restaurant_admins ENABLE ROW LEVEL SECURITY;

-- Admin lê apenas suas próprias entradas
CREATE POLICY "admin_read_own_restaurant" ON restaurant_admins
  FOR SELECT USING (auth.uid() = user_id);

-- Inserts apenas via service_role (API de onboarding)

-- ============================================================
-- CORRIGE RLS QUEBRADO DO SINGLE-TENANT
-- ============================================================

-- Remove o LIMIT 1 que quebra multi-tenant em public_insert_orders
-- A validação real já é feita no app (api/pedidos/route.ts)
DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id)
  );

-- Corrige migration 028: adiciona 'entregue' aos status visíveis
-- (cliente precisa ver confirmação de entrega na tela de acompanhamento)
DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders
  FOR SELECT
  USING (
    created_at > now() - interval '1 hour'
    AND status IN ('recebido', 'preparando', 'pronto', 'saindo', 'entregue')
  );
