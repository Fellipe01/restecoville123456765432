import { headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Páginas públicas (cliente): restaurant ID vem do header x-restaurant-id
// setado pelo middleware com base no hostname da requisição.
export async function getRestaurantId(): Promise<string | null> {
  const h = await headers()
  return h.get('x-restaurant-id')
}

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
