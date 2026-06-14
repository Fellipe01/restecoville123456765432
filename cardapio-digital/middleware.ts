import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

// Resolve qual restaurante corresponde ao hostname da requisição.
// Prioridade:
//  1. Env var NEXT_PUBLIC_RESTAURANT_ID (modo single-tenant — sem latência extra)
//  2. Lookup por custom_domain ou slug no banco via REST API
//  3. Fallback para localhost / domínios de preview — retorna o primeiro restaurante
async function resolveRestaurantId(hostname: string): Promise<string | null> {
  const staticId = process.env.NEXT_PUBLIC_RESTAURANT_ID
  if (staticId) return staticId

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const headers = { apikey: key, Authorization: `Bearer ${key}` }

  const res = await fetch(
    `${url}/rest/v1/restaurants?or=(custom_domain.eq.${hostname},slug.eq.${hostname})&select=id&limit=1`,
    { headers }
  )
  if (res.ok) {
    const data = await res.json()
    if (data?.[0]?.id) return data[0].id
  }

  const isFallbackHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.local')

  if (isFallbackHost) {
    const fallback = await fetch(
      `${url}/rest/v1/restaurants?select=id&limit=1`,
      { headers }
    )
    if (fallback.ok) {
      const data = await fallback.json()
      return data?.[0]?.id ?? null
    }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = (request.headers.get('host') ?? 'localhost').split(':')[0]

  // ── Rotas do admin: só verifica autenticação ──────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next()

    const response = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/admin/login', request.url))
    return response
  }

  // ── Rotas públicas: resolve restaurante pelo hostname ─────────────────────
  const restaurantId = await resolveRestaurantId(hostname)

  const requestHeaders = new Headers(request.headers)
  if (restaurantId) requestHeaders.set('x-restaurant-id', restaurantId)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
