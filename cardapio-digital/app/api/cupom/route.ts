import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  const subtotal = parseFloat(searchParams.get('subtotal') ?? '0') || 0

  if (!code) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 })

  const restaurantId = req.headers.get('x-restaurant-id') ?? await getRestaurantId()
  if (!restaurantId) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

  const supabase = await createClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('code', code)
    .maybeSingle()

  if (!coupon) return NextResponse.json({ error: 'Cupom inválido' }, { status: 404 })
  if (!coupon.is_active) return NextResponse.json({ error: 'Cupom inativo' }, { status: 400 })

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return NextResponse.json({ error: 'Cupom ainda não está válido' }, { status: 400 })
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
  }
  if (subtotal > 0 && subtotal < Number(coupon.min_order_value)) {
    return NextResponse.json({
      error: `Pedido mínimo de R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')} para este cupom`,
    }, { status: 400 })
  }

  const discountAmount = coupon.discount_type === 'percentage'
    ? Math.round(subtotal * Number(coupon.discount_value) / 100 * 100) / 100
    : Math.min(Number(coupon.discount_value), subtotal)

  return NextResponse.json({
    coupon: {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order_value: Number(coupon.min_order_value),
      discount_amount: Math.round(discountAmount * 100) / 100,
    },
  })
}
