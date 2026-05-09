import { NextRequest, NextResponse } from 'next/server'
import { requireDelivererAuth } from '@/lib/auth/deliverer-jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const deliverer = await requireDelivererAuth(req)
  if (!deliverer) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { order_id } = await req.json()
  if (!order_id) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Verificar is_active em tempo real — token de 8h mas revogação imediata se desativado
  const supabasePublic = await createClient()
  const { data: delivererData } = await supabasePublic
    .from('deliverers')
    .select('is_active')
    .eq('id', deliverer.sub)
    .single()
  if (!delivererData?.is_active) {
    return NextResponse.json({ error: 'Conta desativada. Fale com o administrador.' }, { status: 403 })
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

  // Audit log — fire and forget
  supabase.from('audit_log').insert({
    action: 'confirmar_entrega',
    actor_id: deliverer.sub,
    actor_type: 'entregador',
    target_id: order_id,
    metadata: { order_number: data.order_number },
  }).then(() => {}, (e: unknown) => console.error('[audit_log]', e))

  return NextResponse.json({ ok: true, order_number: data.order_number })
}
