export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ProdutosClient from '@/components/admin/produtos-client'

export default async function ProdutosPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: categories }, { data: restaurant }] = await Promise.all([
    supabase.from('products').select('*, category:categories(name)').order('sort_order'),
    supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('restaurants').select('id').single(),
  ])

  return <ProdutosClient initialProducts={products ?? []} categories={categories ?? []} restaurantId={restaurant?.id ?? ''} />
}
