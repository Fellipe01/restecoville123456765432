import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET() {
  const restaurantId = await getRestaurantId()
  if (!restaurantId) return NextResponse.json({ error: 'no restaurantId resolved' })

  const supabase = await createClient()
  const [{ data: restaurant, error: restaurantErr }, { data: categories, error: catErr }, { data: products, error: prodErr }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
    supabase.from('categories').select('*').eq('restaurant_id', restaurantId),
    supabase.from('products').select('id,name,category_id,is_active').eq('restaurant_id', restaurantId),
  ])

  return NextResponse.json({
    restaurantId,
    restaurant: restaurant ? { id: restaurant.id, name: restaurant.name, is_open: restaurant.is_open } : null,
    restaurantErr: restaurantErr?.message ?? null,
    categoriesCount: categories?.length ?? 0,
    categories: categories?.map((c: any) => ({ id: c.id, name: c.name, is_active: c.is_active, sort_order: c.sort_order })) ?? [],
    catErr: catErr?.message ?? null,
    productsCount: products?.length ?? 0,
    products: products?.slice(0, 10) ?? [],
    prodErr: prodErr?.message ?? null,
  })
}
