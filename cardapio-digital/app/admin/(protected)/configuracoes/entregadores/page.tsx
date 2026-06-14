export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import EntregadoresClient from '@/components/admin/entregadores-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function EntregadoresPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')
  const { data: deliverers } = await supabase
    .from('deliverers')
    .select('id, name, phone, is_active, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true })

  return <EntregadoresClient initialDeliverers={deliverers ?? []} />
}
