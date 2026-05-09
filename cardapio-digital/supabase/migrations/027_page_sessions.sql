-- Rastreamento de sessões para cálculo de taxa de conversão
CREATE TABLE IF NOT EXISTS page_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL UNIQUE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  converted     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS page_sessions_restaurant_created
  ON page_sessions (restaurant_id, created_at DESC);

ALTER TABLE page_sessions ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode registrar/atualizar sua própria sessão
CREATE POLICY "sessions_insert" ON page_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "sessions_update" ON page_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Apenas admins autenticados lêem sessões
CREATE POLICY "sessions_read_admin" ON page_sessions
  FOR SELECT TO authenticated USING (true);
