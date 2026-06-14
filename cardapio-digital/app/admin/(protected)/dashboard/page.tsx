export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/admin/dashboard-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')
  return <DashboardClient restaurantId={restaurantId} />
}
