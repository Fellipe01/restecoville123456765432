-- ============================================================
-- AVALIAÇÕES, HORÁRIO DE PRODUTOS E PUSH SUBSCRIPTIONS
-- ============================================================

-- Avaliações pós-pedido
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rating_comment text;

-- Horário de disponibilidade por produto (ex: café só até 11h)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS available_from time,
  ADD COLUMN IF NOT EXISTS available_until time;

-- Subscriptions para notificações push (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  subscription  jsonb       NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_push" ON push_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM restaurant_admins
      WHERE user_id = auth.uid()
        AND restaurant_id = push_subscriptions.restaurant_id
    )
  );
