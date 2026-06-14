export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Restaurant } from '@/types'
import EntregaConfigClient from '@/components/admin/entrega-config-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function EntregaConfigPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, delivery_base_radius_km, delivery_base_fee, delivery_extra_fee_per_km, delivery_max_radius_km')
    .eq('id', restaurantId)
    .single()
  return <EntregaConfigClient restaurant={restaurant as Pick<Restaurant, 'id' | 'delivery_base_radius_km' | 'delivery_base_fee' | 'delivery_extra_fee_per_km' | 'delivery_max_radius_km'>} />
}
