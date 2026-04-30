export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import EntregaConfigClient from '@/components/admin/entrega-config-client'

export default async function EntregaConfigPage() {
  const supabase = await createClient()
  const { data: zones } = await supabase.from('delivery_zones').select('*').order('name')
  const { data: restaurant } = await supabase.from('restaurants').select('id').single()
  return <EntregaConfigClient initialZones={zones ?? []} restaurantId={restaurant?.id ?? ''} />
}
