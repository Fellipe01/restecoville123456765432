export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import { BusinessHours, Restaurant, Category, Product } from '@/types'
import HomeClient from '@/components/cliente/home-client'

function computeIsOpen(hours: BusinessHours[]): boolean | null {
  if (!hours.length) return null // sem horários cadastrados → mantém valor do DB

  // Horário de Brasília (UTC-3)
  const now = new Date()
  let dayOfWeek = now.getUTCDay()
  let currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() - 3 * 60
  if (currentMinutes < 0) {
    currentMinutes += 24 * 60
    dayOfWeek = (dayOfWeek - 1 + 7) % 7
  }

  const today = hours.find((h) => h.day_of_week === dayOfWeek)
  if (!today || today.is_closed) return false

  const [openH, openM] = today.open_time.split(':').map(Number)
  const [closeH, closeM] = today.close_time.split(':').map(Number)
  return currentMinutes >= openH * 60 + openM && currentMinutes <= closeH * 60 + closeM
}

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: restaurant },
    { data: categories },
    { data: products },
    { count: activeOrdersCount },
    { data: businessHours },
  ] = await Promise.all([
    supabase.from('restaurants').select('*').single(),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('products').select('*, category:categories(name)').order('sort_order'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['recebido', 'preparando']),
    supabase.from('business_hours').select('*').order('day_of_week'),
  ])

  // Sobrescreve is_open com cálculo baseado nos horários cadastrados
  const computed = computeIsOpen((businessHours ?? []) as BusinessHours[])
  const effectiveRestaurant = restaurant
    ? { ...restaurant, is_open: computed !== null ? computed : restaurant.is_open }
    : null

  return (
    <HomeClient
      restaurant={effectiveRestaurant as Restaurant}
      categories={(categories ?? []) as Category[]}
      products={(products ?? []) as Product[]}
      activeOrdersCount={activeOrdersCount ?? 0}
    />
  )
}
