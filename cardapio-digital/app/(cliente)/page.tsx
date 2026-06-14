export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import { BusinessHours, Restaurant, Category, Product } from '@/types'
import HomeClient from '@/components/cliente/home-client'
import { computeIsOpen } from '@/lib/business-hours'
import { getRestaurantId } from '@/lib/restaurant'
import { notFound } from 'next/navigation'

export default async function HomePage() {
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()
  if (!restaurantId) notFound()

  const [
    { data: restaurant },
    { data: categories },
    { data: products },
    { count: activeOrdersCount },
    { data: businessHours },
  ] = await Promise.all([
    supabase.from('restaurants').select('*').eq('id', restaurantId).single(),
    supabase.from('categories').select('*').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order'),
    supabase.from('products').select('*, category:categories(name)').eq('restaurant_id', restaurantId).order('sort_order'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).in('status', ['recebido', 'preparando']),
    supabase.from('business_hours').select('*').eq('restaurant_id', restaurantId).order('day_of_week'),
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
