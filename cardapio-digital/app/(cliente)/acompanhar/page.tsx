import { createClient } from '@/lib/supabase/server'
import AcompanharClient from '@/components/cliente/acompanhar-client'
import { getRestaurantId } from '@/lib/restaurant'
import { notFound } from 'next/navigation'

export default async function AcompanharPage() {
  const supabase = await createClient()
  const restaurantId = await getRestaurantId()
  if (!restaurantId) notFound()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, whatsapp_number')
    .eq('id', restaurantId)
    .single()

  return (
    <AcompanharClient
      restaurantId={restaurant?.id ?? ''}
      whatsappNumber={restaurant?.whatsapp_number ?? null}
    />
  )
}
