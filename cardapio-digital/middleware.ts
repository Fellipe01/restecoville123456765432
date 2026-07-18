import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

async function resolveRestaurantId(hostname: string): Promise<string | null> {
  const staticId = process.env.NEXT_PUBLIC_RESTAURANT_ID
  if (staticId) return staticId

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const requestHeaders = { apikey: key, Authorization: `Bearer ${key}` }
  const encodedHostname = encodeURIComponent(hostname)
  const response = await fetch(
    `${url}/rest/v1/restaurants?or=(custom_domain.eq.${encodedHostname},slug.eq.${encodedHostname})&select=id&limit=1`,
    { headers: requestHeaders }
  )

  if (response.ok) {
    const restaurants = await response.json()
    if (restaurants?.[0]?.id) return restaurants[0].id
  }

  const isFallbackHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.local')

  if (!isFallbackHost) return null

  const fallback = await fetch(`${url}/rest/v1/restaurants?select=id&limit=1`, {
    headers: requestHeaders,
  })
  if (!fallback.ok) return null

  const restaurants = await fallback.json()
  return restaurants?.[0]?.id ?? null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'

  if (!isAdminRoute) {
    const hostname = (request.headers.get('host') ?? 'localhost').split(':')[0]
    const restaurantId = await resolveRestaurantId(hostname)
    const requestHeaders = new Headers(request.headers)

    if (restaurantId) requestHeaders.set('x-restaurant-id', restaurantId)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!isLoginPage && !user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (isLoginPage && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  // @supabase/ssr usa algo (provavelmente __dirname via alguma dependência) que não
  // existe no Edge Runtime, o runtime padrão do middleware.ts. Precisa do Node.js
  // runtime — igual o proxy.ts da v16 sempre usava (lá isso nem era configurável).
  runtime: 'nodejs',
}
