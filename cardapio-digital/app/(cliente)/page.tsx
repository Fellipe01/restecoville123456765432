export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Restaurant, Category, Product } from '@/types'
import HomeClient from '@/components/cliente/home-client'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .single()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(name)')
    .order('sort_order')

  return (
    <HomeClient
      restaurant={restaurant as Restaurant}
      categories={(categories ?? []) as Category[]}
      products={(products ?? []) as Product[]}
    />
  )
}
