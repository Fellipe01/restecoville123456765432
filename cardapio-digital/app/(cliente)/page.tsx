export const revalidate = 60

import { createClient } from '@/lib/supabase/server'
import { Restaurant, Category, Product } from '@/types'
import HomeClient from '@/components/cliente/home-client'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: restaurant }, { data: categories }, { data: products }, { count: activeOrdersCount }] =
    await Promise.all([
      supabase.from('restaurants').select('*').single(),
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('products').select('*, category:categories(name)').order('sort_order'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['recebido', 'preparando']),
    ])

  return (
    <HomeClient
      restaurant={restaurant as Restaurant}
      categories={(categories ?? []) as Category[]}
      products={(products ?? []) as Product[]}
      activeOrdersCount={activeOrdersCount ?? 0}
    />
  )
}
