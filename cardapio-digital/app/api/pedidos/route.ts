import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { haversineKm, calcDeliveryFee } from '@/lib/utils'
import { computeIsOpen } from '@/lib/business-hours'
import { getRestaurantId } from '@/lib/restaurant'
import type { BusinessHours } from '@/types'

const itemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  unit_price: z.number().min(0),
  total_price: z.number().min(0),
  notes: z.string().optional().nullable(),
  addons: z.array(z.object({
    addon_id: z.string().optional().nullable(),
    addon_name: z.string(),
    price: z.number().min(0),
  })).optional().default([]),
  variations: z.array(z.object({
    variation_id: z.string().optional().nullable(),
    variation_name: z.string(),
    group_name: z.string(),
    price_modifier: z.number(),
  })).optional().default([]),
})

const orderSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_phone: z.string().min(10).max(15),
  type: z.enum(['balcao', 'delivery']),
  table_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  delivery_fee: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  payment_method: z.enum(['dinheiro', 'debito', 'credito']),
  troco: z.number().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  coupon_code: z.string().optional().nullable(),
  scheduled_for: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
})

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  const rateCheck = await checkRateLimitAsync(ip, { namespace: 'pedidos' })
  if (!rateCheck.ok) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em instantes.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    )
  }

  const supabase = await createClient()

  try {
    const body = await request.json()
    const parsed = orderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    // Valida agendamento
    if (data.scheduled_for) {
      const scheduledDate = new Date(data.scheduled_for)
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json({ error: 'Data de agendamento inválida' }, { status: 400 })
      }
      const minTime = new Date(Date.now() + 30 * 60 * 1000)
      const maxTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      if (scheduledDate < minTime) {
        return NextResponse.json({ error: 'Agendamento deve ser pelo menos 30 minutos no futuro' }, { status: 400 })
      }
      if (scheduledDate > maxTime) {
        return NextResponse.json({ error: 'Agendamento máximo de 7 dias' }, { status: 400 })
      }
    }

    let restaurant: { id: string; lat: number | null; lng: number | null; delivery_base_radius_km: number | null; delivery_base_fee: number | null; delivery_extra_fee_per_km: number | null; delivery_max_radius_km: number | null } | null = null
    {
      const restaurantId = await getRestaurantId()
      const filter = restaurantId
        ? supabase.from('restaurants').select('id, lat, lng, delivery_base_radius_km, delivery_base_fee, delivery_extra_fee_per_km, delivery_max_radius_km').eq('id', restaurantId)
        : supabase.from('restaurants').select('id, lat, lng, delivery_base_radius_km, delivery_base_fee, delivery_extra_fee_per_km, delivery_max_radius_km').limit(1)
      const { data, error } = await filter.single()
      if (!error && data) {
        restaurant = data
      } else {
        const fallback = restaurantId
          ? supabase.from('restaurants').select('id, lat, lng').eq('id', restaurantId)
          : supabase.from('restaurants').select('id, lat, lng').limit(1)
        const { data: basic } = await fallback.single()
        if (basic) restaurant = { ...basic, delivery_base_radius_km: null, delivery_base_fee: null, delivery_extra_fee_per_km: null, delivery_max_radius_km: null }
      }
    }
    if (!restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

    // Bloqueia pedidos imediatos se fechado; agendados sempre passam
    if (!data.scheduled_for) {
      const { data: businessHours } = await supabase.from('business_hours').select('*').eq('restaurant_id', restaurant.id)
      if (!(computeIsOpen((businessHours ?? []) as BusinessHours[]) ?? true)) {
        return NextResponse.json({ error: 'Restaurante fechado no momento' }, { status: 403 })
      }
    }

    // Recalcular preços no servidor
    const productIds = data.items.map((i) => i.product_id)
    const addonIds = data.items.flatMap((i) => i.addons?.map((a) => a.addon_id).filter(Boolean) ?? [])
    const variationIds = data.items.flatMap((i) => i.variations?.map((v) => v.variation_id).filter(Boolean) ?? [])

    const [{ data: products }, { data: addons }, { data: variations }] = await Promise.all([
      supabase.from('products').select('id, base_price, is_available').in('id', productIds),
      addonIds.length > 0
        ? supabase.from('addons').select('id, price, is_available').in('id', addonIds as string[])
        : Promise.resolve({ data: [] }),
      variationIds.length > 0
        ? supabase.from('variations').select('id, price_modifier, is_available').in('id', variationIds as string[])
        : Promise.resolve({ data: [] }),
    ])

    const productMap = new Map((products ?? []).map((p) => [p.id, p]))
    const addonMap = new Map((addons ?? []).map((a) => [a.id, a]))
    const variationMap = new Map((variations ?? []).map((v) => [v.id, v]))

    let serverSubtotal = 0
    const validatedItems = data.items.map((item) => {
      const product = productMap.get(item.product_id)
      if (!product) throw new Error(`Produto não encontrado: ${item.product_id}`)
      if (!product.is_available) throw new Error(`Produto indisponível: ${item.product_name}`)

      let unitPrice = Number(product.base_price)

      for (const v of item.variations ?? []) {
        if (v.variation_id) {
          const dbVariation = variationMap.get(v.variation_id)
          if (!dbVariation) throw new Error(`Variação inválida: ${item.product_name}`)
          if (!dbVariation.is_available) throw new Error(`Variação indisponível: ${item.product_name}`)
          unitPrice += Number(dbVariation.price_modifier)
        }
      }

      for (const a of item.addons ?? []) {
        if (a.addon_id) {
          const dbAddon = addonMap.get(a.addon_id)
          if (!dbAddon) throw new Error(`Adicional inválido: ${item.product_name}`)
          if (!dbAddon.is_available) throw new Error(`Adicional indisponível: ${item.product_name}`)
          unitPrice += Number(dbAddon.price)
        }
      }

      const itemTotal = unitPrice * item.quantity
      serverSubtotal += itemTotal

      return { ...item, unit_price: unitPrice, total_price: itemTotal }
    })

    // Taxa de entrega
    let deliveryFee = 0
    if (data.type === 'delivery') {
      const restLat = restaurant.lat
      const restLng = restaurant.lng
      const hasMigration = restaurant.delivery_base_radius_km != null

      if (restLat != null && restLng != null && data.latitude != null && data.longitude != null && hasMigration) {
        const baseRadius = Number(restaurant.delivery_base_radius_km)
        const baseFee = Number(restaurant.delivery_base_fee ?? 0)
        const extraPerKm = Number(restaurant.delivery_extra_fee_per_km ?? 0)
        const maxRadius = Number(restaurant.delivery_max_radius_km ?? 99)

        const distKm = haversineKm(restLat, restLng, data.latitude, data.longitude)
        if (distKm > maxRadius) {
          return NextResponse.json({ error: 'Endereço fora da área de entrega' }, { status: 400 })
        }
        deliveryFee = calcDeliveryFee(distKm, baseRadius, baseFee, extraPerKm)
      } else {
        deliveryFee = data.delivery_fee
      }
    }

    // Valida e aplica cupom no servidor
    let serverDiscountAmount = 0
    let couponRecord: { id: string; uses_count: number } | null = null

    if (data.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('code', data.coupon_code.trim().toUpperCase())
        .maybeSingle()

      if (!coupon || !coupon.is_active) {
        return NextResponse.json({ error: 'Cupom inválido' }, { status: 400 })
      }

      const now = new Date()
      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
      }
      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
      }
      if (serverSubtotal < Number(coupon.min_order_value)) {
        return NextResponse.json({
          error: `Pedido mínimo de R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')} para este cupom`,
        }, { status: 400 })
      }

      serverDiscountAmount = coupon.discount_type === 'percentage'
        ? Math.round(serverSubtotal * Number(coupon.discount_value) / 100 * 100) / 100
        : Math.min(Number(coupon.discount_value), serverSubtotal)

      couponRecord = { id: coupon.id, uses_count: coupon.uses_count }
    }

    const serverTotal = serverSubtotal - serverDiscountAmount + deliveryFee

    const estimated_ready_at = data.scheduled_for
      ? data.scheduled_for
      : new Date(Date.now() + (data.type === 'delivery' ? 45 : 20) * 60 * 1000).toISOString()

    // Usa RPC apenas quando não há cupom ou agendamento (RPC não conhece esses campos)
    const useRpc = !data.coupon_code && !data.scheduled_for

    if (useRpc) {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_order', {
        order_data: {
          restaurant_id: restaurant.id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          type: data.type,
          table_number: data.table_number ?? '',
          address: data.address ?? '',
          delivery_zone_id: '',
          delivery_fee: deliveryFee,
          subtotal: serverSubtotal,
          total: serverTotal,
          notes: data.notes ?? '',
          estimated_ready_at,
          payment_method: data.payment_method,
          troco: data.troco != null ? String(data.troco) : '',
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          items: validatedItems,
        },
      })

      if (!rpcError) {
        if (data.latitude != null && data.longitude != null) {
          await createAdminClient()
            .from('orders')
            .update({ latitude: data.latitude, longitude: data.longitude })
            .eq('id', rpcResult.id)
        }
        const { data: order } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('id', rpcResult.id)
          .single()
        return NextResponse.json({ order })
      }
    }

    // Fallback: inserts sequenciais (suporta cupom + agendamento)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurant.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        type: data.type,
        table_number: data.table_number || null,
        address: data.address || null,
        delivery_zone_id: null,
        delivery_fee: deliveryFee,
        subtotal: serverSubtotal,
        discount_amount: serverDiscountAmount,
        total: serverTotal,
        notes: data.notes || null,
        estimated_ready_at,
        payment_method: data.payment_method,
        troco: data.troco ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        coupon_code: data.coupon_code ? data.coupon_code.trim().toUpperCase() : null,
        scheduled_for: data.scheduled_for || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    for (const item of validatedItems) {
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes || null,
        })
        .select()
        .single()

      if (itemError) throw itemError

      if (item.addons && item.addons.length > 0) {
        await supabase.from('order_item_addons').insert(
          item.addons.map((a) => ({
            order_item_id: orderItem.id,
            addon_id: a.addon_id,
            addon_name: a.addon_name,
            price: a.addon_id ? Number(addonMap.get(a.addon_id)!.price) : 0,
          }))
        )
      }

      if (item.variations && item.variations.length > 0) {
        await supabase.from('order_item_variations').insert(
          item.variations.map((v) => ({
            order_item_id: orderItem.id,
            variation_id: v.variation_id,
            variation_name: v.variation_name,
            group_name: v.group_name,
            price_modifier: v.variation_id ? Number(variationMap.get(v.variation_id)!.price_modifier) : 0,
          }))
        )
      }
    }

    // Incrementa uses_count do cupom de forma atômica
    if (couponRecord) {
      await supabase
        .from('coupons')
        .update({ uses_count: couponRecord.uses_count + 1 })
        .eq('id', couponRecord.id)
        .eq('uses_count', couponRecord.uses_count)
    }

    return NextResponse.json({ order })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const isUserError = message.includes('indisponível') || message.includes('não encontrado')
    return NextResponse.json({ error: message }, { status: isUserError ? 400 : 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Erro interno' }, { status: 500 })

  return NextResponse.json({ orders: data })
}
