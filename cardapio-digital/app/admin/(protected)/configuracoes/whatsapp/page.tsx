export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import WhatsAppConfigClient from '@/components/admin/whatsapp-config-client'

export default async function WhatsAppConfigPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase.from('restaurants').select('id, whatsapp_number').single()
  return <WhatsAppConfigClient restaurantId={restaurant?.id ?? ''} whatsapp={restaurant?.whatsapp_number ?? ''} />
}
