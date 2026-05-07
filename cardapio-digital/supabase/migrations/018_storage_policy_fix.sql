-- A-5: Restringe upload de imagens à pasta do restaurante do admin autenticado
-- Antes: qualquer admin autenticado podia fazer upload em qualquer pasta do bucket
-- Depois: admin só pode fazer upload dentro de "<restaurant_id>/*"

DROP POLICY IF EXISTS "auth_insert_product_images" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_product_images" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_product_images" ON storage.objects;

-- Upload restrito à pasta do próprio restaurante
-- O componente já envia o arquivo como "<restaurant_id>/<timestamp>.<ext>"
CREATE POLICY "auth_insert_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants
    )
  );

-- Atualizar apenas arquivos dentro das pastas existentes
CREATE POLICY "auth_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants
    )
  );

-- Deletar apenas arquivos dentro das pastas existentes
CREATE POLICY "auth_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM restaurants
    )
  );
