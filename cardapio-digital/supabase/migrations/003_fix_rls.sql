-- Corrige políticas RLS de pedidos
-- Problema: INSERT aceitava qualquer restaurant_id, inclusive IDs falsos

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders
  FOR INSERT
  WITH CHECK (
    restaurant_id = (SELECT id FROM restaurants LIMIT 1)
  );

-- Garante que order_items só são inseridos em pedidos que existem
DROP POLICY IF EXISTS "public_insert_order_items" ON order_items;
CREATE POLICY "public_insert_order_items" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id)
  );

-- Garante que order_item_addons só são inseridos em order_items que existem
DROP POLICY IF EXISTS "public_insert_order_item_addons" ON order_item_addons;
CREATE POLICY "public_insert_order_item_addons" ON order_item_addons
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM order_items WHERE id = order_item_id)
  );

-- Garante que order_item_variations só são inseridos em order_items que existem
DROP POLICY IF EXISTS "public_insert_order_item_variations" ON order_item_variations;
CREATE POLICY "public_insert_order_item_variations" ON order_item_variations
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM order_items WHERE id = order_item_id)
  );
