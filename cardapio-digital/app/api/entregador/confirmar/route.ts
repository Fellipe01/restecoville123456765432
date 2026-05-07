import { NextRequest, NextResponse } from 'next/server'
import { requireDelivererAuth } from '@/lib/auth/deliverer-jwt'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const deliverer = await requireDelivererAuth(req)
  if (!deliverer) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { order_id } = await req.json()
  if (!order_id) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Confirma apenas se o pedido PERTENCE a esse entregador
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'entregue' })
    .eq('id', order_id)
    .eq('deliverer_id', deliverer.sub)   // garante que é o dono do pedido
    .eq('status', 'saindo')
    .select('id, order_number')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Pedido não encontrado ou não pertence a você' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, order_number: data.order_number })
}
