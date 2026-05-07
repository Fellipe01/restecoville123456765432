-- Cria o bucket para imagens de produtos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
) ON CONFLICT DO NOTHING;

-- Leitura pública (qualquer um pode ver as imagens no cardápio)
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'product-images');

-- Upload apenas para admins autenticados
CREATE POLICY "auth_insert_product_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- Atualizar/sobrescrever imagens (admins)
CREATE POLICY "auth_update_product_images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

-- Deletar imagens antigas (admins)
CREATE POLICY "auth_delete_product_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');
