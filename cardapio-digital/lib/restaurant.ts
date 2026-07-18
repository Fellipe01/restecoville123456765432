import { headers } from 'next/headers'
import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BusinessHours, Restaurant } from '@/types'

// Páginas públicas (cliente): restaurant ID vem do header x-restaurant-id
// setado pelo middleware com base no hostname da requisição.
export async function getRestaurantId(): Promise<string | null> {
  const h = await headers()
  return h.get('x-restaurant-id')
}

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
