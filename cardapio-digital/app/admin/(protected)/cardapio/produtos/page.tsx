export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import ProdutosClient from '@/components/admin/produtos-client'

export default async function ProdutosPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name)')
    .order('sort_order')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  return <ProdutosClient initialProducts={products ?? []} categories={categories ?? []} />
}
