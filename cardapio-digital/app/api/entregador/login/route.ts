import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signDelivererJWT } from '@/lib/auth/deliverer-jwt'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

const FAKE_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345'

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  const rateCheck = await checkRateLimitAsync(ip, { namespace: 'entregador-login', maxRequests: 5 })
  if (!rateCheck.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde um momento.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
    )
  }

  const { name, password } = await req.json()
  if (!name?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 400 })
  }

  // restaurant_id vem do header x-restaurant-id (setado pelo middleware)
  const restaurantId = req.headers.get('x-restaurant-id')

  const supabase = createAdminClient()

  const safeName = name.trim().replace(/[%_\\]/g, '\\$&')
  let query = supabase
    .from('deliverers')
    .select('id, name, phone, restaurant_id, password_hash, is_active')
    .ilike('name', safeName)
    .limit(1)

  if (restaurantId) query = query.eq('restaurant_id', restaurantId)

  const { data: deliverers } = await query
  const deliverer = deliverers?.[0]

  const hashToCheck = deliverer?.password_hash ?? FAKE_HASH
  const valid = await bcrypt.compare(password, hashToCheck)

  if (!deliverer || !valid) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  if (!deliverer.is_active) {
    return NextResponse.json({ error: 'Conta desativada. Fale com o administrador.' }, { status: 403 })
  }

  const token = await signDelivererJWT({
    sub: deliverer.id,
    name: deliverer.name,
    restaurant_id: deliverer.restaurant_id,
  })

  return NextResponse.json({
    token,
    session: {
      id: deliverer.id,
      name: deliverer.name,
      phone: deliverer.phone,
      restaurant_id: deliverer.restaurant_id,
    },
  })
}
