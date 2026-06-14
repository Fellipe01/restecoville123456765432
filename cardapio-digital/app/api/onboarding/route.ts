import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function POST(req: NextRequest) {
  const secret = process.env.ONBOARDING_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Onboarding desabilitado neste ambiente.' }, { status: 403 })
  }

  const body = await req.json()
  const { restaurantName, email, password, secret: bodySecret } = body

  if (bodySecret !== secret) {
    return NextResponse.json({ error: 'Chave de acesso inválida.' }, { status: 403 })
  }

  if (!restaurantName?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Nome do restaurante, e-mail e senha são obrigatórios.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const slug = slugify(restaurantName.trim())

  // Verifica se slug já existe
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `O nome "${restaurantName}" já está em uso. Escolha outro nome.` },
      { status: 409 }
    )
  }

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // Cria restaurante
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({ name: restaurantName.trim(), slug })
    .select('id, name, slug')
    .single()

  if (restaurantError) {
    // Rollback: remove usuário criado
    await supabase.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: restaurantError.message }, { status: 500 })
  }

  // Vincula usuário ao restaurante
  const { error: adminError } = await supabase
    .from('restaurant_admins')
    .insert({ user_id: userId, restaurant_id: restaurant.id })

  if (adminError) {
    await supabase.auth.admin.deleteUser(userId)
    await supabase.from('restaurants').delete().eq('id', restaurant.id)
    return NextResponse.json({ error: adminError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug },
    message: `Restaurante criado! Acesse o painel em /${restaurant.slug}/admin/login`,
  }, { status: 201 })
}
