-- Adiciona forma de pagamento e troco aos pedidos
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'dinheiro'
  CHECK (payment_method IN ('dinheiro', 'debito', 'credito'));

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS troco NUMERIC(10,2);

-- Função para criação atômica de pedido (previne estado inconsistente)
CREATE OR REPLACE FUNCTION public.create_order(order_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number INTEGER;
  v_item JSONB;
  v_order_item_id UUID;
  v_addon JSONB;
  v_variation JSONB;
BEGIN
  INSERT INTO orders (
    restaurant_id, customer_name, customer_phone, type,
    table_number, address, delivery_zone_id, delivery_fee,
    subtotal, total, notes, estimated_ready_at,
    payment_method, troco
  ) VALUES (
    (order_data->>'restaurant_id')::UUID,
    order_data->>'customer_name',
    order_data->>'customer_phone',
    order_data->>'type',
    NULLIF(order_data->>'table_number', ''),
    NULLIF(order_data->>'address', ''),
    CASE WHEN order_data->>'delivery_zone_id' IS NULL OR order_data->>'delivery_zone_id' = ''
      THEN NULL ELSE (order_data->>'delivery_zone_id')::UUID END,
    (order_data->>'delivery_fee')::NUMERIC,
    (order_data->>'subtotal')::NUMERIC,
    (order_data->>'total')::NUMERIC,
    NULLIF(order_data->>'notes', ''),
    (order_data->>'estimated_ready_at')::TIMESTAMPTZ,
    order_data->>'payment_method',
    CASE WHEN order_data->>'troco' IS NULL OR order_data->>'troco' = ''
      THEN NULL ELSE (order_data->>'troco')::NUMERIC END
  )
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(order_data->'items')
  LOOP
    INSERT INTO order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price, notes
    ) VALUES (
      v_order_id,
      CASE WHEN v_item->>'product_id' IS NULL OR v_item->>'product_id' = ''
        THEN NULL ELSE (v_item->>'product_id')::UUID END,
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total_price')::NUMERIC,
      NULLIF(v_item->>'notes', '')
    )
    RETURNING id INTO v_order_item_id;

    FOR v_addon IN SELECT * FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_item->'addons', '[]'::JSONB))
    LOOP
      INSERT INTO order_item_addons (order_item_id, addon_id, addon_name, price)
      VALUES (
        v_order_item_id,
        CASE WHEN v_addon->>'addon_id' IS NULL OR v_addon->>'addon_id' = ''
          THEN NULL ELSE (v_addon->>'addon_id')::UUID END,
        v_addon->>'addon_name',
        (v_addon->>'price')::NUMERIC
      );
    END LOOP;

    FOR v_variation IN SELECT * FROM JSONB_ARRAY_ELEMENTS(COALESCE(v_item->'variations', '[]'::JSONB))
    LOOP
      INSERT INTO order_item_variations (
        order_item_id, variation_id, variation_name, group_name, price_modifier
      ) VALUES (
        v_order_item_id,
        CASE WHEN v_variation->>'variation_id' IS NULL OR v_variation->>'variation_id' = ''
          THEN NULL ELSE (v_variation->>'variation_id')::UUID END,
        v_variation->>'variation_name',
        v_variation->>'group_name',
        (v_variation->>'price_modifier')::NUMERIC
      );
    END LOOP;
  END LOOP;

  RETURN JSONB_BUILD_OBJECT('id', v_order_id, 'order_number', v_order_number);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(JSONB) TO anon, authenticated;
