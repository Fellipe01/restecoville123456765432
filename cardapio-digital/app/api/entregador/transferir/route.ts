import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireDelivererAuth } from '@/lib/auth/deliverer-jwt'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const deliverer = await requireDelivererAuth(request)
  if (!deliverer) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { order_id, to_deliverer_id } = await request.json()

  if (!order_id || !to_deliverer_id) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // from_deliverer_id vem do token JWT — não do body (C-2)
  const from_deliverer_id = deliverer.sub

  const supabase = await createClient()
  const { data: target } = await supabase
    .from('deliverers')
    .select('id, is_active')
    .eq('id', to_deliverer_id)
    .single()

  if (!target?.is_active) {
    return NextResponse.json({ error: 'Entregador de destino inativo' }, { status: 400 })
  }

  // Admin client — sem RLS — mas a cláusula WHERE garante que só o dono pode transferir
  const admin = createAdminClient()
  const { error } = await admin
    .from('orders')
    .update({ deliverer_id: to_deliverer_id })
    .eq('id', order_id)
    .eq('deliverer_id', from_deliverer_id)  // só transfere se for o dono
    .eq('status', 'saindo')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
