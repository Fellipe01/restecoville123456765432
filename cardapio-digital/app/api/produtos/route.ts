import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantId, getAdminRestaurantId } from '@/lib/restaurant'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const restaurantId = request.headers.get('x-restaurant-id') ?? await getRestaurantId()
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')

  let query = supabase
    .from('products')
    .select('*, category:categories(name), variation_groups(*, variations(*)), addon_groups(*, addons(*))')
    .order('sort_order')

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)
  if (categoryId) query = query.eq('category_id', categoryId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ products: data })
}

const ALLOWED_PRODUCT_FIELDS = new Set([
  'name', 'description', 'base_price', 'is_available', 'sort_order', 'category_id', 'image_url', 'type', 'available_from', 'available_until',
])

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 403 })

  const body = await request.json()
  const { id } = body
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_PRODUCT_FIELDS) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ product: data })
}
