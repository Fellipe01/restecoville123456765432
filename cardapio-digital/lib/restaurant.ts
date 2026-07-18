import { headers } from 'next/headers'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusinessHours, Restaurant } from '@/types'

// Resolve qual restaurante corresponde ao hostname da requisição.
// Prioridade:
//  1. Env var NEXT_PUBLIC_RESTAURANT_ID (modo single-tenant — sem latência extra)
//  2. Lookup por custom_domain ou slug no banco via REST API
//  3. Fallback pra localhost / domínios de preview — retorna o primeiro restaurante
async function resolveRestaurantIdByHostname(hostname: string): Promise<string | null> {
  const staticId = process.env.NEXT_PUBLIC_RESTAURANT_ID
  if (staticId) return staticId

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  const requestHeaders = { apikey: key, Authorization: `Bearer ${key}` }
  const encodedHostname = encodeURIComponent(hostname)
  const response = await fetch(
    `${url}/rest/v1/restaurants?or=(custom_domain.eq.${encodedHostname},slug.eq.${encodedHostname})&select=id&limit=1`,
    { headers: requestHeaders, cache: 'no-store' }
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
    cache: 'no-store',
  })
  if (!fallback.ok) return null

  const restaurants = await fallback.json()
  return restaurants?.[0]?.id ?? null
}

// Páginas e API routes públicas (cliente): resolve o restaurant ID pelo hostname
// da requisição (Host header). cache() garante que, dentro da mesma requisição,
// isso só bate no Supabase uma vez mesmo chamado de vários lugares.
//
// Antes isso era resolvido no middleware.ts e propagado via header x-restaurant-id.
// Mudou pra resolução direta aqui porque o Edge Middleware está com um bug de
// bundling nessa versão do Next.js/Vercel (ReferenceError: __dirname is not
// defined mesmo num middleware vazio, sem nenhuma lógica) — resolver direto no
// Server Component evita depender do middleware por completo.
export const getRestaurantId = cache(async function getRestaurantId(): Promise<string | null> {
  const h = await headers()
  const hostname = (h.get('host') ?? 'localhost').split(':')[0]
  return resolveRestaurantIdByHostname(hostname)
})

// Layout e page do grupo (cliente) precisam ambos do restaurante e dos horários
// de funcionamento. cache() garante que, dentro da mesma requisição, essa busca
// só bate no Supabase uma vez — sem isso, layout e page duplicavam as duas
// consultas cada carregamento de página.
export const getRestaurantWithHours = cache(async function getRestaurantWithHours(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<{ restaurant: Restaurant | null; businessHours: BusinessHours[] }> {
  const [{ data: restaurant }, { data: businessHours }] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
    supabase.from('business_hours').select('*').eq('restaurant_id', restaurantId).order('day_of_week'),
  ])
  return {
    restaurant: (restaurant as Restaurant) ?? null,
    businessHours: (businessHours as BusinessHours[]) ?? [],
  }
})

// Páginas e API routes do admin: restaurant ID vem da tabela restaurant_admins
// vinculada ao usuário autenticado. Faz fallback para o primeiro restaurante
// em instalações antigas sem registro em restaurant_admins.
export async function getAdminRestaurantId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: entry } = await supabase
    .from('restaurant_admins')
    .select('restaurant_id')
    .eq('user_id', user.id)
    .single()

  if (entry?.restaurant_id) return entry.restaurant_id

  // Fallback para instalações single-tenant sem registro em restaurant_admins
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .limit(1)
    .single()
  return restaurant?.id ?? null
}
