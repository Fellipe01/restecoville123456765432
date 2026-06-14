export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CuponsClient from '@/components/admin/cupons-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function CuponsPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  return <CuponsClient initialCoupons={coupons ?? []} restaurantId={restaurantId} />
}
