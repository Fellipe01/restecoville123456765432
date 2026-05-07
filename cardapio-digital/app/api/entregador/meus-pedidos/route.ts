import { NextRequest, NextResponse } from 'next/server'
import { requireDelivererAuth } from '@/lib/auth/deliverer-jwt'
import { createAdminClient } from '@/lib/supabase/admin'

// Retorna apenas os pedidos do entregador autenticado (A-3)
export async function GET(req: NextRequest) {
  const deliverer = await requireDelivererAuth(req)
  if (!deliverer) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .select('*, delivery_zone:delivery_zones(name, fee)')
    .eq('status', 'saindo')
    .eq('deliverer_id', deliverer.sub)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: data ?? [] })
}
