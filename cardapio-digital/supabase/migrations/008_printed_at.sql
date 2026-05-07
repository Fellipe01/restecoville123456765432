-- Controle de impressão para o agente local
ALTER TABLE orders ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ NULL;

-- Index para o polling do agente (pedidos não impressos recentes)
CREATE INDEX IF NOT EXISTS idx_orders_printed_at ON orders (printed_at, created_at)
  WHERE printed_at IS NULL;
