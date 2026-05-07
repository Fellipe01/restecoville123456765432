-- Permite entregador (anon) ver pedidos prontos para entrega
CREATE POLICY "public_select_pronto_delivery" ON orders
  FOR SELECT TO anon
  USING (status = 'pronto' AND type = 'delivery');

-- Permite entregador (anon) pegar um grupo: pronto → saindo + define deliverer_id
CREATE POLICY "public_claim_order" ON orders
  FOR UPDATE TO anon
  USING (status = 'pronto' AND type = 'delivery' AND deliverer_id IS NULL)
  WITH CHECK (status = 'saindo');

-- Permite entregador (anon) transferir pedido para outro entregador (mantém status saindo)
CREATE POLICY "public_transfer_order" ON orders
  FOR UPDATE TO anon
  USING (status = 'saindo')
  WITH CHECK (status = 'saindo');
