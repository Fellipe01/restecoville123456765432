-- ============================================================
-- SECURITY FIX — Remove políticas RLS permissivas demais
-- As operações de entregador agora usam service_role via
-- Next.js API routes protegidas por JWT (não dependem mais de RLS)
-- ============================================================

-- C-6: Remove política que permitia anon trocar deliverer_id em pedidos 'saindo'
DROP POLICY IF EXISTS "public_transfer_order" ON orders;

-- C-6/A-3: Remove política que expunha TODOS os pedidos 'saindo' para anon
-- (entregadores agora usam GET /api/entregador/meus-pedidos com JWT)
DROP POLICY IF EXISTS "public_select_saindo_orders" ON orders;

-- Remove políticas de UPDATE de entregador — agora usam service_role + JWT auth
DROP POLICY IF EXISTS "public_claim_order" ON orders;
DROP POLICY IF EXISTS "public_update_entregue" ON orders;

-- Remove leitura pública de pedidos prontos (grupos via API com JWT)
DROP POLICY IF EXISTS "public_select_pronto_delivery" ON orders;

-- M-2: Revoga execução da RPC de criação de pedido por anon
-- (clientes não precisam disso — a rota /api/pedidos já existe)
-- Nota: se a RPC não existir, este comando é silenciosamente ignorado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_order') THEN
    REVOKE EXECUTE ON FUNCTION public.create_order(JSONB) FROM anon;
  END IF;
END $$;

-- Mantém: public_select_deliverers (necessário para login funcionar)
-- Mantém: public_read_orders (leitura pública das últimas 48h — para acompanhar pedido próprio)
-- Mantém: admin_read_orders + admin_update_orders (admin autenticado)
