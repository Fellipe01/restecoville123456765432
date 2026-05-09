export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { Restaurant } from '@/types'
import CheckoutClient from '@/components/cliente/checkout-client'

export default async function CheckoutPage() {
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .single()

  return (
    <CheckoutClient restaurant={restaurant as Restaurant} />
  )
}
