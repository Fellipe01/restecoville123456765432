import { createClient } from '@/lib/supabase/server'
import EntregadorClient from '@/components/entregador/entregador-client'

export default async function EntregadorPage() {
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('city')
    .single()

  return <EntregadorClient city={restaurant?.city ?? ''} />
}
