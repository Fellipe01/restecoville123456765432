export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CategoriasClient from '@/components/admin/categorias-client'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const [{ data: categories }, { data: restaurant }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('restaurants').select('id').single(),
  ])

  return <CategoriasClient initialCategories={categories ?? []} restaurantId={restaurant?.id ?? ''} />
}
