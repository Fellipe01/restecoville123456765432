export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import RestauranteConfigClient from '@/components/admin/restaurante-config-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function RestauranteConfigPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')
  const { data: restaurant } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single()
  return <RestauranteConfigClient restaurant={restaurant} />
}
