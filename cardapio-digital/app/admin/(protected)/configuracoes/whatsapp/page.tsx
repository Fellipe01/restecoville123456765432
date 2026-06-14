export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import WhatsAppConfigClient from '@/components/admin/whatsapp-config-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function WhatsAppConfigPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, whatsapp_number')
    .eq('id', restaurantId)
    .single()
  return <WhatsAppConfigClient restaurantId={restaurant?.id ?? ''} whatsapp={restaurant?.whatsapp_number ?? ''} />
}
