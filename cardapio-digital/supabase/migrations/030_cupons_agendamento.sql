-- ============================================================
-- CUPONS DE DESCONTO
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   uuid          NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code            text          NOT NULL,
  discount_type   text          NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  numeric(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_value numeric(10,2) NOT NULL DEFAULT 0,
  max_uses        integer,
  uses_count      integer       NOT NULL DEFAULT 0,
  valid_from      timestamptz,
  valid_until     timestamptz,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, code)
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Público pode ler cupons (code é a chave secreta)
CREATE POLICY "public_read_coupons" ON coupons FOR SELECT USING (true);

-- Apenas admins autenticados gerenciam cupons
CREATE POLICY "admin_manage_coupons" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurant_admins
      WHERE user_id = auth.uid()
        AND restaurant_id = coupons.restaurant_id
    )
  );

-- ============================================================
-- AGENDAMENTO E DESCONTO NAS ORDENS
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code    text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_for  timestamptz;
