-- Permite leitura pública da tabela deliverers para o login do entregador funcionar
-- O password_hash é bcrypt (seguro) — apenas o servidor faz a comparação
CREATE POLICY "public_select_deliverers" ON deliverers
  FOR SELECT TO anon USING (true);

-- Permite leitura pública de pedidos com status 'saindo' para a tela do entregador
CREATE POLICY "public_select_saindo_orders" ON orders
  FOR SELECT TO anon USING (status = 'saindo');

-- Permite que a rota de confirmar entrega atualize o status via anon
CREATE POLICY "public_update_entregue" ON orders
  FOR UPDATE TO anon
  USING (status = 'saindo')
  WITH CHECK (status = 'entregue');
