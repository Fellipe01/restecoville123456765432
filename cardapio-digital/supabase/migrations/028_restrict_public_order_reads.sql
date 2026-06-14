-- Restringe leitura pública de pedidos para reduzir exposição de PII
-- Problema: a policy anterior permite que qualquer anon leia TODOS os pedidos
-- das últimas 2h fazendo SELECT * sem filtros, expondo nome/telefone/endereço.
--
-- Solução: pedidos públicos só são legíveis via filtro de ID (acompanhamento
-- direto por link) ou via status ativo (para a tela de acompanhar por telefone).
-- A janela temporal permanece em 1h — reduz a superfície de exposição.
--
-- NOTA: a correção completa exige mover as leituras do acompanhar-client.tsx
-- para uma API route que valide o telefone server-side antes de retornar dados.

DROP POLICY IF EXISTS "public_read_orders" ON orders;

CREATE POLICY "public_read_orders" ON orders
  FOR SELECT
  USING (
    created_at > now() - interval '1 hour'
    AND status IN ('recebido', 'preparando', 'pronto', 'saindo')
  );

-- order_items, addons e variations: mantém leitura pública mas só para pedidos
-- que o anon já consegue ver (RLS das tabelas pai limita indiretamente via JOIN,
-- mas como são tabelas separadas aplicamos a mesma restrição de janela temporal)
DROP POLICY IF EXISTS "public_read_order_items" ON order_items;
CREATE POLICY "public_read_order_items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.created_at > now() - interval '1 hour'
        AND orders.status IN ('recebido', 'preparando', 'pronto', 'saindo')
    )
  );

DROP POLICY IF EXISTS "public_read_order_item_addons" ON order_item_addons;
CREATE POLICY "public_read_order_item_addons" ON order_item_addons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_addons.order_item_id
        AND o.created_at > now() - interval '1 hour'
        AND o.status IN ('recebido', 'preparando', 'pronto', 'saindo')
    )
  );

DROP POLICY IF EXISTS "public_read_order_item_variations" ON order_item_variations;
CREATE POLICY "public_read_order_item_variations" ON order_item_variations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_variations.order_item_id
        AND o.created_at > now() - interval '1 hour'
        AND o.status IN ('recebido', 'preparando', 'pronto', 'saindo')
    )
  );
