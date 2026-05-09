import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signDelivererJWT } from '@/lib/auth/deliverer-jwt'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

// Hash falso garante timing constante mesmo quando usuário não existe (A-4)
const FAKE_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345'

export async function POST(req: NextRequest) {
  // 5 tentativas por minuto por IP — proteção contra brute force
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

  const supabase = createAdminClient()

  const safeName = name.trim().replace(/[%_\\]/g, '\\$&')
  const { data: deliverers } = await supabase
    .from('deliverers')
    .select('id, name, phone, restaurant_id, password_hash, is_active')
    .ilike('name', safeName)
    .limit(1)

  const deliverer = deliverers?.[0]

  // Sempre executa bcrypt para equalizar timing — evita enumeração de usuários
  const hashToCheck = deliverer?.password_hash ?? FAKE_HASH
  const valid = await bcrypt.compare(password, hashToCheck)

  // Mensagem genérica — não revela se usuário existe ou não
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
