import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const restaurantId = request.headers.get('x-restaurant-id') ?? await getRestaurantId()

  let query = supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ categories: data })
}
