export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import PedidosClient from '@/components/admin/pedidos-client'

export default async function PedidosPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*, addons:order_item_addons(*), variations:order_item_variations(*))')
    .in('status', ['recebido', 'preparando', 'pronto'])
    .order('created_at', { ascending: true })

  return <PedidosClient initialOrders={orders ?? []} />
}
