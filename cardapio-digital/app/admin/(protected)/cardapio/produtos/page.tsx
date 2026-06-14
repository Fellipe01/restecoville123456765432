export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ProdutosClient from '@/components/admin/produtos-client'
import { getAdminRestaurantId } from '@/lib/restaurant'
import { redirect } from 'next/navigation'

export default async function ProdutosPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)
  if (!restaurantId) redirect('/admin/login')

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*, category:categories(name)').eq('restaurant_id', restaurantId).order('sort_order'),
    supabase.from('categories').select('id, name').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order'),
  ])

  return <ProdutosClient initialProducts={products ?? []} categories={categories ?? []} restaurantId={restaurantId} />
}
