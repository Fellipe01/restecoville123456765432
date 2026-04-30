export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import HorariosConfigClient from '@/components/admin/horarios-config-client'

export default async function HorariosPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase.from('restaurants').select('id').single()
  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('restaurant_id', restaurant?.id)
    .order('day_of_week')
  return <HorariosConfigClient initialHours={hours ?? []} restaurantId={restaurant?.id ?? ''} />
}
