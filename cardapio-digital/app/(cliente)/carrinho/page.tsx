import { createClient } from '@/lib/supabase/server'
import CarrinhoClient from '@/components/cliente/carrinho-client'
import { Product } from '@/types'

export default async function CarrinhoPage() {
  const supabase = await createClient()

  const { data: upsellProducts } = await supabase
    .from('products')
    .select(`
      *,
      category:categories!inner(id, show_in_cart),
      variation_groups(id, required),
      addon_groups(id, required)
    `)
    .eq('categories.show_in_cart', true)
    .eq('is_available', true)
    .order('sort_order')

  return <CarrinhoClient upsellProducts={(upsellProducts ?? []) as Product[]} />
}
