import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildDeliveryGroups } from '@/lib/grouping'
import { requireDelivererAuth } from '@/lib/auth/deliverer-jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { Order } from '@/types'

// GET — lista grupos disponíveis (requer auth)
export async function GET(req: NextRequest) {
  const deliverer = await requireDelivererAuth(req)
  if (!deliverer) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('lat, lng')
    .single()

  const admin = createAdminClient()
  const { data: orders, error } = await admin
    .from('orders')
    .select('*, items:order_items(*), delivery_zone:delivery_zones(name, fee)')
    .eq('status', 'pronto')
    .eq('type', 'delivery')
    .is('deliverer_id', null)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const groups = buildDeliveryGroups(
    (orders ?? []) as Order[],
    restaurant?.lat ?? undefined,
    restaurant?.lng ?? undefined,
  )

  return NextResponse.json({ groups })
}

// POST — entregador reivindica um grupo (requer auth — C-3)
export async function POST(request: NextRequest) {
  const deliverer = await requireDelivererAuth(request)
  if (!deliverer) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // deliverer_id vem do token — não do body (C-3)
  const deliverer_id = deliverer.sub
  const { order_ids } = await request.json()

  if (!order_ids?.length) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: delivererData } = await supabase
    .from('deliverers')
    .select('id, is_active')
    .eq('id', deliverer_id)
    .single()

  if (!delivererData?.is_active) {
    return NextResponse.json({ error: 'Entregador inativo' }, { status: 403 })
  }

  const groupId = crypto.randomUUID()

  // Admin client — atomic claim sem depender de RLS permissiva
  const admin = createAdminClient()
  const { data: claimed, error } = await admin
    .from('orders')
    .update({ status: 'saindo', deliverer_id, group_id: groupId })
    .in('id', order_ids)
    .eq('status', 'pronto')
    .is('deliverer_id', null)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Pedidos já foram pegos por outro entregador' }, { status: 409 })
  }

  return NextResponse.json({ claimed: claimed.map((o) => o.id), group_id: groupId })
}
