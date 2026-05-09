export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Product } from '@/types'
import ItemClient from '@/components/cliente/item-client'
import { notFound } from 'next/navigation'

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      variation_groups (
        *,
        variations (*)
      ),
      addon_groups (
        *,
        addons (*)
      )
    `)
    .eq('id', id)
    .single()

  if (!product) notFound()

  return <ItemClient product={product as Product} />
}
