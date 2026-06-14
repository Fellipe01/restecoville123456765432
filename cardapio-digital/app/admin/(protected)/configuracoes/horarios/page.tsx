export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import HorariosConfigClient from '@/components/admin/horarios-config-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function HorariosPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')
  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('day_of_week')
  return <HorariosConfigClient initialHours={hours ?? []} restaurantId={restaurantId} />
}
