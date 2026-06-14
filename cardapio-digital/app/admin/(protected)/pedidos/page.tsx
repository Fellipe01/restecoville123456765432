export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import PedidosClient from '@/components/admin/pedidos-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function PedidosPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*, addons:order_item_addons(*), variations:order_item_variations(*))')
    .eq('restaurant_id', restaurantId)
    .in('status', ['recebido', 'preparando', 'pronto', 'saindo', 'entregue'])
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: true })

  return <PedidosClient initialOrders={orders ?? []} />
}
