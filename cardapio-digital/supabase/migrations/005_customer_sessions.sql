-- Sessões de clientes: persiste o telefone usado para acompanhar pedidos
CREATE TABLE IF NOT EXISTS customer_sessions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  phone         TEXT        NOT NULL,
  restaurant_id UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_seen_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone, restaurant_id)
);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode registrar/atualizar sua própria sessão
CREATE POLICY "public_insert_session" ON customer_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "public_update_session" ON customer_sessions
  FOR UPDATE USING (true);

-- Apenas admin lê as sessões
CREATE POLICY "admin_read_sessions" ON customer_sessions
  FOR SELECT USING (auth.role() = 'authenticated');
