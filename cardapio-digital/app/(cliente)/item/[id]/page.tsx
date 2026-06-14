export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import ItemClient from '@/components/cliente/item-client'
import { notFound } from 'next/navigation'
import { getRestaurantId } from '@/lib/restaurant'

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()

  const query = supabase
    .from('products')
    .select(`*, variation_groups(*, variations(*)), addon_groups(*, addons(*)), combo_items(*)`)
    .eq('id', id)
  if (restaurantId) query.eq('restaurant_id', restaurantId)

  const { data: product } = await query.single()

  if (!product) notFound()

  return <ItemClient product={product as Product} />
}
