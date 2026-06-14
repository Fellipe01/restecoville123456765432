export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CozinhaClient from '@/components/admin/cozinha-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function CozinhaPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')

  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('restaurant_id', restaurantId)
      .in('status', ['recebido', 'preparando'])
      .order('created_at', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, is_available')
      .eq('restaurant_id', restaurantId)
      .order('name'),
  ])

  return <CozinhaClient initialOrders={orders ?? []} initialProducts={products ?? []} />
}
