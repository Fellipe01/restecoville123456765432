-- ============================================================
-- COMBOS DE PRODUTOS
-- ============================================================

-- Tipo do produto: 'simple' (padrão) ou 'combo'
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'simple'
  CHECK (type IN ('simple', 'combo'));

-- Itens incluídos no combo (texto livre, não vinculado a produtos)
CREATE TABLE IF NOT EXISTS combo_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id   uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  quantity   integer     NOT NULL DEFAULT 1,
  sort_order integer     NOT NULL DEFAULT 0
);

ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;

-- Público pode ler (para exibir no cardápio)
CREATE POLICY "public_read_combo_items" ON combo_items
  FOR SELECT USING (true);

-- Admins autenticados podem gerenciar
CREATE POLICY "auth_write_combo_items" ON combo_items
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
