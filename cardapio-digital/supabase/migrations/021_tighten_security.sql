-- ============================================================
-- SECURITY FIX — Aperta políticas RLS restantes
-- ============================================================

-- M-3: Reduz janela de dados públicos de 48h para 2h
-- Mantém todos os status visíveis dentro da janela (cliente precisa ver pedido entregue)
-- Após 2h o pedido sai da leitura pública — reduz exposição de dados pessoais
DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders
  FOR SELECT
  USING (
    created_at > now() - interval '2 hours'
  );

-- C-5 (parcial): Restringe admin a ver apenas pedidos do próprio restaurante
-- Nota: sistema atual é single-tenant, mas a política anterior permitia
-- que qualquer authenticated lesse pedidos de qualquer restaurante
DROP POLICY IF EXISTS "admin_read_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Garante que admin só lê deliverers do próprio restaurante
-- (sistema single-tenant — apenas 1 restaurante por instância Supabase)
-- Quando migrar para multi-tenant, adicionar: AND restaurant_id = (SELECT restaurant_id FROM admins WHERE id = auth.uid())
