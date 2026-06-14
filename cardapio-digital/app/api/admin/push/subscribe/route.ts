import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminRestaurantId } from '@/lib/restaurant'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 403 })

  const subscription = await request.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })

  // Upsert por endpoint para evitar duplicatas
  await supabase
    .from('push_subscriptions')
    .upsert(
      { restaurant_id: restaurantId, subscription },
      { onConflict: 'restaurant_id,subscription->endpoint' }
    )

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 403 })

  const { endpoint } = await request.json()
  if (endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('subscription->>endpoint', endpoint)
  }

  return NextResponse.json({ ok: true })
}
