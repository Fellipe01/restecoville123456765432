import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminRestaurantId } from '@/lib/restaurant'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 403 })

  const { name, phone, password } = await req.json()
  if (!name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Nome e senha obrigatórios' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('deliverers')
    .insert({ name: name.trim(), phone: phone?.trim() || null, password_hash, restaurant_id: restaurantId })
    .select('id, name, phone, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deliverer: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 403 })

  const { id, name, phone, password, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined)      updates.name = name.trim()
  if (phone !== undefined)     updates.phone = phone?.trim() || null
  if (is_active !== undefined) updates.is_active = is_active
  if (password?.trim())        updates.password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('deliverers')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select('id, name, phone, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deliverer: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('deliverers').delete().eq('id', id).eq('restaurant_id', restaurantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
