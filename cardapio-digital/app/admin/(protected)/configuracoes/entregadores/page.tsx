export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import EntregadoresClient from '@/components/admin/entregadores-client'

export default async function EntregadoresPage() {
  const supabase = await createClient()
  const { data: deliverers } = await supabase
    .from('deliverers')
    .select('id, name, phone, is_active, created_at')
    .order('created_at', { ascending: true })

  return <EntregadoresClient initialDeliverers={deliverers ?? []} />
}
