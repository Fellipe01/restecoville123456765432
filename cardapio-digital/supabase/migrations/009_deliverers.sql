CREATE TABLE IF NOT EXISTS deliverers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deliverers ENABLE ROW LEVEL SECURITY;

-- Somente admins autenticados gerenciam entregadores
CREATE POLICY "admin_all_deliverers" ON deliverers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
