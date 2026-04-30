export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/admin/dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false })

  const { data: activeOrders } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['recebido', 'preparando', 'pronto'])
    .order('created_at', { ascending: true })

  return <DashboardClient orders={orders ?? []} activeOrders={activeOrders ?? []} />
}
