export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Order } from '@/types'
import ConfirmacaoClient from '@/components/cliente/confirmacao-client'
import { notFound } from 'next/navigation'
import { getRestaurantId } from '@/lib/restaurant'

export default async function ConfirmacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*, addons:order_item_addons(*), variations:order_item_variations(*))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: restaurant } = restaurantId
    ? await supabase.from('restaurants').select('*').eq('id', restaurantId).single()
    : { data: null }

  return <ConfirmacaoClient order={order as Order} whatsapp={restaurant?.whatsapp_number} />
}
