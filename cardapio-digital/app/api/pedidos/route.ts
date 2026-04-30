import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const itemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
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
  delivery_zone_id: z.string().uuid().optional().nullable(),
  delivery_fee: z.number().min(0).default(0),
  subtotal: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional().nullable(),
  payment_method: z.enum(['dinheiro', 'debito', 'credito']),
  troco: z.number().optional().nullable(),
  items: z.array(itemSchema).min(1).max(50),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const parsed = orderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const data = parsed.data

    const { data: restaurant } = await supabase.from('restaurants').select('id').single()
    if (!restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

    const estimated_ready_at = new Date(
      Date.now() + (data.type === 'delivery' ? 45 : 20) * 60 * 1000
    ).toISOString()

    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_order', {
      order_data: {
        restaurant_id: restaurant.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        type: data.type,
        table_number: data.table_number ?? '',
        address: data.address ?? '',
        delivery_zone_id: data.delivery_zone_id ?? '',
        delivery_fee: data.delivery_fee,
        subtotal: data.subtotal,
        total: data.total,
        notes: data.notes ?? '',
        estimated_ready_at,
        payment_method: data.payment_method,
        troco: data.troco != null ? String(data.troco) : '',
        items: data.items,
      },
    })

    if (rpcError) {
      // fallback: insert sequencial se a RPC ainda não foi aplicada
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          type: data.type,
          table_number: data.table_number || null,
          address: data.address || null,
          delivery_zone_id: data.delivery_zone_id || null,
          delivery_fee: data.delivery_fee,
          subtotal: data.subtotal,
          total: data.total,
          notes: data.notes || null,
          estimated_ready_at,
          payment_method: data.payment_method,
          troco: data.troco ?? null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      for (const item of data.items) {
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
              price: a.price,
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
              price_modifier: v.price_modifier,
            }))
          )
        }
      }

      return NextResponse.json({ order })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', rpcResult.id)
      .single()

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Erro ao criar pedido:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ orders: data })
}
