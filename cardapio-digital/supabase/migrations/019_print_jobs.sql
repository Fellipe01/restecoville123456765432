CREATE TABLE IF NOT EXISTS print_jobs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid REFERENCES orders(id) ON DELETE CASCADE,
  type       text NOT NULL CHECK (type IN ('cozinha', 'entrega')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Admin autenticado pode inserir jobs de impressão
CREATE POLICY "authenticated_insert_print_jobs" ON print_jobs
  FOR INSERT TO authenticated WITH CHECK (true);
