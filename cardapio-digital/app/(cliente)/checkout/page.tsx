export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { DeliveryZone, Restaurant } from '@/types'
import CheckoutClient from '@/components/cliente/checkout-client'

export default async function CheckoutPage() {
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .single()

  const { data: zones } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('name')

  return (
    <CheckoutClient
      restaurant={restaurant as Restaurant}
      deliveryZones={(zones ?? []) as DeliveryZone[]}
    />
  )
}
