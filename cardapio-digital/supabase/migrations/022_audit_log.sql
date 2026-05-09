-- Audit log para operações críticas do sistema
-- Registra: confirmações de entrega, transferências e claims de grupo

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text        NOT NULL,
  actor_id    text        NOT NULL,
  actor_type  text        NOT NULL CHECK (actor_type IN ('entregador', 'admin')),
  target_id   text,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins autenticados podem ler o log
CREATE POLICY "admin_read_audit_log" ON audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Inserts somente via service_role (API routes com admin client)
-- Anon e authenticated NÃO podem inserir diretamente

-- Índices para queries comuns
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON audit_log (target_id);
