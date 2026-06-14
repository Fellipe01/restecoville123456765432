export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getAdminRestaurantId } from '@/lib/restaurant'
import RelatorioProdutosClient from '@/components/admin/relatorio-produtos-client'

export default async function RelatorioProdutosPage() {
  const supabase = await createClient()
  const restaurantId = await getAdminRestaurantId(supabase)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: items } = await supabase
    .from('order_items')
    .select('product_name, quantity, total_price, order:orders!inner(restaurant_id, created_at, status)')
    .eq('order.restaurant_id', restaurantId ?? '')
    .neq('order.status', 'cancelado')
    .gte('order.created_at', thirtyDaysAgo)

  // Agrega por produto
  const map = new Map<string, { qty: number; revenue: number }>()
  for (const item of items ?? []) {
    const cur = map.get(item.product_name) ?? { qty: 0, revenue: 0 }
    map.set(item.product_name, {
      qty: cur.qty + item.quantity,
      revenue: cur.revenue + item.total_price,
    })
  }

  const products = Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.qty - a.qty)

  // Média de avaliações
  const { data: ratings } = await supabase
    .from('orders')
    .select('rating')
    .eq('restaurant_id', restaurantId ?? '')
    .not('rating', 'is', null)
    .gte('created_at', thirtyDaysAgo)

  const avgRating = ratings && ratings.length > 0
    ? ratings.reduce((s, r) => s + (r.rating ?? 0), 0) / ratings.length
    : null

  return (
    <RelatorioProdutosClient
      products={products}
      totalRatings={ratings?.length ?? 0}
      avgRating={avgRating}
    />
  )
}
