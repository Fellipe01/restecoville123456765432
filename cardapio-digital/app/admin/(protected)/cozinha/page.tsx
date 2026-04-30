export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CozinhaClient from '@/components/admin/cozinha-client'

export default async function CozinhaPage() {
  const supabase = await createClient()

  const [{ data: orders }, { data: products }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .in('status', ['recebido', 'preparando'])
      .order('created_at', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, is_available')
      .order('name'),
  ])

  return <CozinhaClient initialOrders={orders ?? []} initialProducts={products ?? []} />
}
