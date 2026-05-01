import { createClient } from '@/lib/supabase/server'
import AcompanharClient from '@/components/cliente/acompanhar-client'

export default async function AcompanharPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, whatsapp_number')
    .single()

  return (
    <AcompanharClient
      restaurantId={restaurant?.id ?? ''}
      whatsappNumber={restaurant?.whatsapp_number ?? null}
    />
  )
}
