import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const body = await request.json()
  const rating = parseInt(body.rating)
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : null

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Nota inválida (1-5)' }, { status: 400 })
  }

  // Só permite avaliar pedidos entregues que ainda não foram avaliados
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, rating')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (order.status !== 'entregue') return NextResponse.json({ error: 'Só é possível avaliar pedidos entregues' }, { status: 400 })
  if (order.rating) return NextResponse.json({ error: 'Pedido já foi avaliado' }, { status: 409 })

  const { error } = await supabase
    .from('orders')
    .update({ rating, rating_comment: comment })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
