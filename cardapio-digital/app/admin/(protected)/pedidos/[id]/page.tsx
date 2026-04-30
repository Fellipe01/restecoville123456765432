export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Order } from '@/types'
import PedidoDetalheClient from '@/components/admin/pedido-detalhe-client'
import { notFound } from 'next/navigation'

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, items:order_items(*, addons:order_item_addons(*), variations:order_item_variations(*)), delivery_zone:delivery_zones(*)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  return <PedidoDetalheClient order={order as Order} />
}
