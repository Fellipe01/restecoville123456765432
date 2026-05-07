import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // 1. Autenticação obrigatória
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // 2. restaurant_id vem do banco (baseado no admin autenticado), nunca do cliente
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
  }

  // 3. Valida tamanho
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagem muito grande. Máximo 5 MB.' }, { status: 400 })
  }

  // 4. Valida tipo MIME — whitelist restrita (não confia no nome do arquivo)
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 })
  }

  const path = `${restaurant.id}/${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('product-images')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = admin.storage.from('product-images').getPublicUrl(path)

  return NextResponse.json({ url: data.publicUrl })
}
