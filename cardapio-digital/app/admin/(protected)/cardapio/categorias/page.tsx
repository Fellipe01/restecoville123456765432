export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CategoriasClient from '@/components/admin/categorias-client'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  return <CategoriasClient initialCategories={categories ?? []} />
}
