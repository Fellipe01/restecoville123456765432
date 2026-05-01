-- Restringe leitura pública de pedidos aos últimos 48h
-- Previne dump massivo de dados de clientes
DROP POLICY IF EXISTS "public_read_orders" ON orders;
CREATE POLICY "public_read_orders" ON orders
  FOR SELECT
  USING (
    created_at > now() - interval '48 hours'
  );

-- Admin continua lendo tudo (política admin_update_orders já garante autenticado)
-- Adiciona política de leitura total para admins autenticados
DROP POLICY IF EXISTS "admin_read_orders" ON orders;
CREATE POLICY "admin_read_orders" ON orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Adiciona pedido mínimo por zona de entrega
ALTER TABLE delivery_zones
  ADD COLUMN IF NOT EXISTS minimum_order NUMERIC(10,2) NOT NULL DEFAULT 0;
