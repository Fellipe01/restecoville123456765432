export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/admin/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase.from('restaurants').select('id').single()
  return <DashboardClient restaurantId={restaurant?.id ?? ''} />
}
