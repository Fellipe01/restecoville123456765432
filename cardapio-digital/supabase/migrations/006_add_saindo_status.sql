-- Adiciona status 'saindo' para delivery em trânsito
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('recebido', 'preparando', 'pronto', 'saindo', 'entregue', 'cancelado'));
