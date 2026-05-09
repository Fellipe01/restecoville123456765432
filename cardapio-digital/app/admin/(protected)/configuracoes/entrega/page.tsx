export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Restaurant } from '@/types'
import EntregaConfigClient from '@/components/admin/entrega-config-client'

export default async function EntregaConfigPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, delivery_base_radius_km, delivery_base_fee, delivery_extra_fee_per_km, delivery_max_radius_km')
    .single()
  return <EntregaConfigClient restaurant={restaurant as Pick<Restaurant, 'id' | 'delivery_base_radius_km' | 'delivery_base_fee' | 'delivery_extra_fee_per_km' | 'delivery_max_radius_km'>} />
}
